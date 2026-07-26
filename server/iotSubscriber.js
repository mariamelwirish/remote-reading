// iotSubscriber.js
//
// Holds a persistent MQTT subscription to devices/+/status, using the
// backend's own IAM credentials over MQTT-over-WebSocket (SigV4 signed) —
// NOT a certificate like the Pi uses. Certificates are for physical
// devices; IAM auth is the right fit for your own backend service.
//
// This is architecturally different from iot.js, which only ever does
// one-off REST-style publishes. Subscribing requires a real, long-lived
// connection, since MQTT is push-based — there's no "check for messages"
// endpoint to poll.
//
// Recordings already flip to 'played' immediately when a play command is
// sent (optimistic, in recordings.js / scheduler.js). This subscriber's
// job is narrower: log real-time lifecycle events (started/played/stopped),
// write a genuine playback_log row on confirmed success, and catch genuine
// device failures by reverting a recording back to pending_review.

const { iot, mqtt5 } = require('aws-iot-device-sdk-v2');
const pool = require('./config/db');

const STATUS_TOPIC_FILTER = 'devices/+/status'; // '+' = single-level wildcard

let client = null;

function buildClient() {
    // Builds a WebSocket connection signed with the backend's own AWS
    // credentials (same credential chain iot.js and s3.js already use —
    // env vars locally, EC2 instance role in production). No certificate
    // files needed here, unlike the Pi.
    const wsConfig = iot.AwsIotMqtt5ClientConfigBuilder.newWebsocketMqttBuilderWithSigv4Auth(
        process.env.AWS_IOT_ENDPOINT,
        {
            region: process.env.AWS_REGION,
        }
    );

    return new mqtt5.Mqtt5Client(wsConfig.build());
}

async function handleStatusMessage(topic, payloadBuffer) {
    let payload;
    try {
        payload = JSON.parse(payloadBuffer.toString());
    } catch (err) {
        console.error('iotSubscriber: received malformed JSON on', topic);
        return;
    }

    // Topic shape: devices/{device_code}/status — pull device_code out of it.
    const parts = topic.split('/');
    const device_code = parts[1];

    const { recording_id, status, duration_played_seconds, trigger_type } = payload;

    if (!recording_id || !status) {
        console.error('iotSubscriber: status message missing recording_id or status, ignoring:', payload);
        return;
    }

    const connection = await pool.getConnection();

    try {
        const [recordings] = await connection.query(
            'SELECT id, status FROM recordings WHERE id = ?',
            [recording_id]
        );

        if (recordings.length === 0) {
            console.error(`iotSubscriber: recording ${recording_id} not found, ignoring status.`);
            return;
        }

        const recording = recordings[0];

        const [devices] = await connection.query(
            'SELECT id FROM devices WHERE device_code = ?',
            [device_code]
        );

        if (devices.length === 0) {
            console.error(`iotSubscriber: no device found for device_code ${device_code}, cannot write playback_log.`);
            return;
        }

        const device_id = devices[0].id;

        if (status === 'started') {
            // Real-time visibility only — recording is already 'played'
            // optimistically in the DB, so nothing to change here. This is
            // the hook a future live "currently playing" UI indicator would
            // read from.
            console.log(`iotSubscriber: recording ${recording_id} started playing on device ${device_code}.`);
            return;
        }

        if (status === 'played') {
            // Recording was already marked 'played' the moment the command
            // was sent — this confirmation just proves it genuinely
            // happened, and lets us log the real, actual duration.
            await connection.query(
                `INSERT INTO playback_log (id, recording_id, device_id, triggered_by, duration_played_seconds, trigger_source)
                 VALUES (UUID(), ?, ?, 
                    (SELECT reviewed_by FROM recordings WHERE id = ?), 
                    ?, ?)`,
                [recording_id, device_id, recording_id, duration_played_seconds || 0, trigger_type || 'manual']
            );
            console.log(`iotSubscriber: recording ${recording_id} confirmed played (${duration_played_seconds}s), playback_log written.`);
            return;
        }

        if (status === 'stopped') {
            // Nurse-initiated stop already reverted the DB via /stop itself —
            // nothing further to do here, this message just confirms the
            // device actually received and acted on the stop command.
            console.log(`iotSubscriber: recording ${recording_id} confirmed stopped on device. Duration played: ${duration_played_seconds}s.`);
            return;
        }

        // Any other status (fetch_failed, etc.) means the device could not
        // actually play it, even though we optimistically marked it 'played'
        // when the command was sent. Only revert if it's still sitting at
        // 'played' — if something else already changed it since, don't
        // stomp on a newer, unrelated state.
        if (recording.status === 'played') {
            await connection.beginTransaction();

            await connection.query(
                `UPDATE recordings SET status = 'pending_review' WHERE id = ?`,
                [recording_id]
            );

            await connection.query(
                `INSERT INTO recording_status_history (recording_id, from_status, to_status, changed_by, note)
                 VALUES (?, 'played', 'pending_review', 
                    (SELECT reviewed_by FROM recordings WHERE id = ?), 
                    ?)`,
                [recording_id, recording_id, `Device reported failure: ${status}`]
            );

            await connection.commit();
            console.warn(`iotSubscriber: recording ${recording_id} failed on device (${status}), reverted to pending_review.`);
        } else {
            console.warn(`iotSubscriber: recording ${recording_id} reported '${status}' but is already '${recording.status}', skipping revert.`);
        }
    } catch (err) {
        await connection.rollback();
        console.error('iotSubscriber: error handling status message:', err);
    } finally {
        connection.release();
    }
}

function startIotSubscriber() {
    client = buildClient();

    client.on('error', (error) => {
        console.error('iotSubscriber: connection error:', error);
    });

    client.on('disconnection', (eventData) => {
        console.warn('iotSubscriber: disconnected from AWS IoT Core.', eventData);
    });

    client.on('stopped', () => {
        console.warn('iotSubscriber: client stopped.');
    });

    client.on('messageReceived', (eventData) => {
        const topic = eventData.message.topicName;
        const payloadBuffer = Buffer.from(eventData.message.payload);
        handleStatusMessage(topic, payloadBuffer);
    });

    client.on('connectionSuccess', () => {
        console.log('iotSubscriber: connected to AWS IoT Core.');
        client.subscribe({
            subscriptions: [{ qos: mqtt5.QoS.AtLeastOnce, topicFilter: STATUS_TOPIC_FILTER }],
        }).then(() => {
            console.log(`iotSubscriber: subscribed to ${STATUS_TOPIC_FILTER}`);
        }).catch((err) => {
            console.error('iotSubscriber: subscribe failed:', err);
        });
    });

    client.start();
}

module.exports = { startIotSubscriber };