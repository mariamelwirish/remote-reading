// iot.js

// Import the IoT Data Plane client and Publish command from the AWS SDK.
// This is a separate client from IoT Core's "control plane" (which manages
// Things, certs, and policies) — the data plane is just for publish/subscribe.
const { IoTDataPlaneClient, PublishCommand } = require('@aws-sdk/client-iot-data-plane');

// Create the IoT Data client instance.
// Unlike S3/SES, this client needs an explicit endpoint — IoT Core's data plane
// is account-specific, not a fixed regional URL, so it can't be inferred from
// region alone (see AWS_IOT_ENDPOINT, fetched once via `aws iot describe-endpoint`).
const iotClient = new IoTDataPlaneClient({
    region: process.env.AWS_REGION,
    endpoint: `https://${process.env.AWS_IOT_ENDPOINT}`
});

// Publish a play command to a device's topic.
// device_code is the devices.device_code string (matches the Thing name
// registered in AWS IoT Core), NOT the internal devices.id UUID.
// payload carries what the Pi needs to actually fetch and play the audio,
// plus trigger_type so the Pi can echo it back in its status confirmation
// (needed later for playback_log.trigger_source).
const publishPlay = async (device_code, { recording_id, presigned_url, trigger_type }) => {
    const topic = `devices/${device_code}/play`;
    const payload = {
        command: 'play',
        recording_id,
        presigned_url,
        trigger_type, // 'manual' | 'scheduled'
        issued_at: new Date().toISOString()
    };

    const command = new PublishCommand({
        topic,
        payload: Buffer.from(JSON.stringify(payload)),
        qos: 1 // at-least-once delivery — a dropped play command is a real clinical miss
    });

    await iotClient.send(command);
};

// Publish a stop command to a device's topic.
// No recording-specific payload needed — stop just means "whatever is playing, stop it."
const publishStop = async (device_code) => {
    const topic = `devices/${device_code}/stop`;
    const payload = {
        command: 'stop',
        issued_at: new Date().toISOString()
    };

    const command = new PublishCommand({
        topic,
        payload: Buffer.from(JSON.stringify(payload)),
        qos: 1
    });

    await iotClient.send(command);
};

module.exports = { publishPlay, publishStop };