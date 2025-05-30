# HackIntro's Attack Defense Capture-The-Flag (CTF) Game

Welcome to Hackintro's Attack Defense Capture-The-Flag (CTF) game! Here are the rules to ensure a fair and fun experience for everyone:

## [Rules](#rules)

- **Rule #1:** We play fair. No attempts to gain root access, no DOS, no attacks on the infrastructure or our fellow students and instructors. We extract flags and submit them - we do **_NOT_** `rm -rf /` and so on. Failure to do so will result in a grade of zero, but even worse, it'll ruin the experience for everyone.
- **Rule #2:** Make sure you follow rule #1.

## [Resources](#resources)

- Every team will start with the same set of services running in a similarly configured Linux box.
- Credentials to login to the network and your box will be committed to your repository. **DO NOT LOSE THESE** or give them to others - you are giving control of your box.
- All competition boxes are on the same prefix (`10.219.255.X`). You can find them through `ping` / `nmap` / `etc` and `verify`. You do **_NOT_** have to send any traffic outside those IPs.
- Your default user is called `ctf` and can `sudo` to all other services. For a list of given capabilities checkout `/etc/sudoers`.

## [Game Mechanics and Goals](#goals)

- The event will last for a little over 48 hours, split in windows of 15 minutes.
- During each window flags are refreshed within your boxes - one for each service. You must **_NOT_** remove these files - this is a violation of the rules.
- **Goal #1:** ensure that your service is operational and functionally similar to the original service you were provided (modulo vulnerabilities). On every time window your service will be evaluated for functionality and whether it breaks the Service Level Agreement (SLA). Functionality checks vary across time. Failing to preserve functionality breaks the SLA and is penalized heavily (see scoring below).
- **Goal #2:** ensure flags are not _taken_ from your services. You can do this by patching: note that you can patch vulnerabilities but all other functionality must be preserved. How can you patch? Look for options!
- **Goal #3:** get the flags from other teams and submit them (see below how). Because flags are rotating with time windows, you can submit multiple flags for a single service as long as you can consistently exploit it across time.

## [Flag Submission](#flag-submission)

Your repo will contain an `api_key` that you can use to submit flags. To submit a flag, run the following:

```bash
curl https://ctf.hackintro25.di.uoa.gr/submit -H "Content-Type: application/json" -H "Authorization: Bearer your_api_key" -d '{"flag": "flag_contents_go_here"}'
```

## [Scoring](#scoring)

For every service, within each time window you will receive a score based on the following criteria:<br><br>

- Gaining a flag gives you 2 points.
- Losing a flag takes away 2 points.
- Keeping your service running with no loss of functionality gives you 42 points.<br><br>

The leaderboard will reflect these metrics as the game progresses. Consider the various tradeoffs and choose wisely on what strategy you want to follow. The game is designed to be educational, so try different approaches and learn from them.

## [Help and Tips](#help)

- Are you getting exploited and want to see how? You may be able to figure it out through the pcaps that are being captured under `/pcaps` in your box.
- Wanna sudo to a service user? Simply run:<br><br>

```bash
sudo -u service_user_name bash
```

<br>

- Can't find an exploit? Move to another service, maybe this one isn't exploitable. The opposing team fixed their bug and you can no longer exploit them? Look deeper into the code, maybe more than one bugs are present.
- Did you get compromised or accidentally lost all your service files? You can find a copy of them under /home/ctf/backup and hopefully you can still restore service.
- Need help / have a question / wanna share ideas or provide commentary? You can follow the traditional route for such events, aka reach out to the `#attack-defense` channel on Discord. Mods should be responsive during "normal hours".

## [Last but not least: Have fun!!](#fun)
