# Speaker (Raspberry Pi) Setup Guide

How a physical speaker goes from a box on a shelf to playing messages in a baby's
room — and **who does what** at each step.

---

## The one big idea

There are **two separate halves**, and confusing them is the #1 source of headaches:

| Half | What it is | Where it happens |
|------|------------|------------------|
| **1. Register** | Bookkeeping — creates a record so the app knows the speaker exists and can assign it to a baby. | The **website** (Speakers tab), instant. |
| **2. Connect** | The physical Pi gets its certificate + software and starts talking to AWS. | On the **Pi**, done once by a technical person (today). |

> Registering does **not** connect anything. A registered-but-not-connected speaker
> correctly shows **Offline** until half 2 is done.

---

## What you need (one time)

**Hardware**
- Raspberry Pi + power supply
- microSD card
- Speaker (USB or 3.5 mm headphone jack)

**On the technical person's laptop**
- [Raspberry Pi Imager](https://www.raspberrypi.com/software/) (free)
- AWS CLI, logged in with permissions to manage AWS IoT
- `jq` installed
- This repository cloned (for `scripts/register-device.sh` and `pi/pi_subscriber.py`)
- The `nicu-device-policy` must already exist in AWS IoT

---

## Step-by-step

### Step 1 — Get the speaker's ID from the app  *(admin, in the website)*
1. Sign in as **admin** → **Speakers** tab → **Add speaker** → **Generate speaker ID**.
2. The app assigns a unique ID (e.g. `PI-00002`) and shows it. **Copy it.**
3. Hand that exact ID to whoever sets up the Pi.

> Letting the app generate the ID guarantees it's unique — no guessing, no collisions.

### Step 2 — Image the SD card  *(technical person, one time per Pi)*
Using Raspberry Pi Imager, write **Raspberry Pi OS** to the card, and in its settings:
- set a **hostname** (e.g. `pi-002`),
- **enable SSH**,
- enter the **Wi‑Fi name + password** (so it joins the network on boot), and
- set a **username + password** for the Pi.

Insert the card, power on the Pi, and wait ~1 minute for it to join the network.

### Step 3 — Provision the Pi  *(technical person, from the laptop)*
From the repo's `scripts/` folder, run it with: **the ID from Step 1**, the Pi's
address, and the Pi's username:

```bash
cd scripts
./register-device.sh  PI-00002  pi-002.local  admin
```

No login or token needed — the app record was already created in Step 1, so this
script only talks to **AWS** and the **Pi** (using your AWS credentials + SSH).

It automatically:
1. creates the AWS IoT **certificate** for `PI-00002` (reuses it on re-runs),
2. **SSHes into the Pi** to install the software (`paho-mqtt`, `requests`, `mpg123`) and copy the certificate + `pi_subscriber.py` + config onto it,
3. installs an **auto-start service** and starts it — so the player runs on boot and restarts on crash. **No manual start needed.**

You'll be asked for the **Pi's password** (for SSH, and once for `sudo` in the
service step). To stop the repeated SSH prompts, run `ssh-copy-id admin@pi-002.local`
once beforehand.

> The ID you pass here **must match** the ID from Step 1 — it's how the app's
> record, the AWS identity, and the physical Pi all refer to the same speaker.

### Step 4 — Confirm it's online  *(nothing to do)*
The script already started the player as an auto-restarting service, so within a few
seconds the speaker turns **Online (green)** in the Speakers tab on its own — and it
will come back on its own after any reboot or power cut.

Check the service any time (SSH in first, so the user session is set up):
```bash
ssh admin@pi-002.local
systemctl --user status pi-subscriber.service
```

### Step 5 — Place it and assign it  *(nurse / admin)*
1. Put the Pi + speaker in the baby's room, plugged into power.
2. **Speakers** tab → **Assign** → pick the baby. The room is derived from the baby.

Done — it's ready to play messages.

---

## Auto-start on boot (a *user* service)

`register-device.sh` sets this up **automatically** (step `[3/4]`). It installs the
player as a systemd **user** service and turns on **lingering**, which matters for two
reasons:
- it runs inside the user's session, so it can reach the Pi's **audio** (a *system*
  service can't — that makes playback silent even though everything else looks fine), and
- lingering makes it start on boot and restart on crash, without anyone logging in.

You don't have to do anything. Useful commands (SSH in **first**, so the user session
and audio access are set up):
```bash
ssh admin@pi-002.local
systemctl --user status pi-subscriber.service      # is it running?
journalctl --user -u pi-subscriber.service -e       # recent logs
systemctl --user restart pi-subscriber.service      # restart it
```

---

## Resetting a Pi to set it up again from scratch

To wipe a Pi and re-run the full flow cleanly:

**On the Pi** (SSH in), remove the service and copied files:
```bash
# remove the user service (the current setup)
systemctl --user disable --now pi-subscriber.service 2>/dev/null
rm -f ~/.config/systemd/user/pi-subscriber.service
systemctl --user daemon-reload 2>/dev/null
# remove any OLD system service left over from an earlier attempt
sudo systemctl disable --now pi-subscriber.service 2>/dev/null
sudo rm -f /etc/systemd/system/pi-subscriber.service
sudo systemctl daemon-reload
# remove the certs, player, and config
rm -rf ~/certs ~/pi_subscriber.py ~/device_config.py ~/pi-subscriber.service
```

**In the website:** Speakers tab → delete the device (use the force option if it has
playback history).

**On your laptop (optional):** to force a brand-new AWS certificate, delete the local
cert folder `scripts/certs/<DEVICE_CODE>/`. Leaving it makes the script reuse the
existing certificate.

Then get a fresh ID (Speakers → Generate speaker ID) and run `register-device.sh` again.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Speaker stays **Offline** | The player service isn't running, or the Pi isn't on the network. SSH in, then check `systemctl --user status pi-subscriber.service` and `journalctl --user -u pi-subscriber.service -e`. Confirm the Pi has internet. |
| **Says "played" but no sound** (0 seconds, JACK errors in the log) | The service can't reach the Pi's audio. It must be a **user** service with lingering (this guide's setup), not a system service. Re-run `register-device.sh` to reinstall it correctly. |
| **"A device with that code already exists"** during Step 3 | Expected if you generated the ID in Step 1. The script continues; ignore it. |
| **"Play now" is greyed out** for a baby | The baby's speaker is offline or unassigned. The recordings screen tells you which. |
| Speaker went **Offline mid-use** | Power or network dropped. Any message that was playing auto-returns to review with a note. Reconnect the Pi. |
| Wrong ID typed in Step 3 | The AWS identity won't match the app record — re-run with the correct ID from Step 1. |

---

## Coming later: fully automated onboarding

The goal is to remove Steps 2–4 as per-device manual work: a **pre-imaged "golden"
SD card** + a bootstrap agent + **AWS Fleet Provisioning** so each Pi **pulls its own
certificate on first boot** and self-registers. Then the flow is just: power the Pi on
→ it appears in the Speakers tab → assign it to a baby. This needs a one-time AWS +
image setup (not yet built).
