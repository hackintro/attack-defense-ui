import { useEffect, useRef, useState } from 'react';

export default function rules({ theme, currentTheme }) {

  return (
    <main className="container mx-auto flex-1 px-4 py-6">
      <h1 className="mb-8 text-center text-2xl font-bold">
        HackIntro's Attack Defense Capture-The-Flag (CTF) Game
      </h1>

      <div className={`${currentTheme.textSecondary}`}>
        Welcome to Hackintro's Attack Defense Capture-The-Flag (CTF) game! Here are the rules to ensure a fair and fun experience for everyone:
        <h2 className="text-xl" id="rules"><a href="#rules">Rules</a></h2>
        <ul className="">
          <li>Rule #1: We play fair. No attempts to gain root access, no DOS, no attacks on the infrastructure or our fellow students and instructors. We extract flags and submit them - we do *NOT* rm -rf / and so on. Failure to do so will result in a grade of zero, but even worse, it'll ruin the experience for everyone.</li>
          <li>Rule #2: Make sure you follow rule #1.</li>
        </ul>
        <h2 className="text-xl" id="resources"><a href="#resources">Resources</a></h2>
        <ul className="">
            <li>Every team will start with the same set of services running in a similarly configured Linux box.</li>
            <li>Credentials to login to the network and your box will be committed to your repository. DO NOT LOSE THESE or give them to others - you are giving control of your box.</li>
            <li>All competition boxes are on the same prefix (10.219.255.X). You can find them through ping / nmap / etc and verify. You do *NOT* have to send any traffic outside those IPs.</li>
            <li>Your default user is called ctf and can sudo to all other services. For a list of given capabilities checkout /etc/sudoers.</li>
        </ul>
        <h2 className="text-xl" id="goals"><a href="#goals">Game Mechanics and Goals</a></h2>
        <ul className="">
            <li>The event will last for a little over 48 hours, split in windows of 15 minutes.</li>
            <li>During each window flags are refreshed within your boxes - one for each service. You must *NOT* remove these files - this is a violation of the rules. </li>
            <li>Goal #1: ensure that your service is operational and functionally similar to the original service you were provided (modulo vulnerabilities). On every time window your service will be evaluated for functionality and whether it breaks the Service Level Agreement (SLA). Functionality checks vary across time. Failing to preserve functionality breaks the SLA and is penalized heavity (see scoring below).</li>
            <li>Goal #2: ensure flags are not *taken* from your services. You can do this by patching: note that you can patch vulnerabilities but all other functionality must be preserved. How can you patch? Look for options!</li>
            <li>Goal #3: get the flags from other teams and submit them (see below how). Because flags are rotating with time windows, you can submit multiple flags for a single service as long as you can consistently exploit it across time.</li>
        </ul>

        <h2 className="text-xl" id="flag-submission"><a href="#flag-submission">Flag Submission</a></h2>
        Your repo will contain an api_key that you can use to submit flags. To submit a flag, run the following:
        <pre className="bg-gray-100 p-4 rounded-md">
          <code className="text-sm">
            curl https://ctf.hackintro25.di.uoa.gr/submit -H "Content-Type: application/json" -H "Authorization: Bearer your_api_key" -d '{'{"flag": "flag_contents_go_here"}'}'
          </code>
        </pre>

        <h2 className="text-xl" id="scoring"><a href="#scoring">Scoring</a></h2>
        For every service, within each time window you will receive a score based on the following criteria:
        <ul className="">
            <li>Gaining a flag gives you 2 points.</li>
            <li>Losing a flag takes away 2 points.</li>
            <li>Keeping your service running with no loss of functionality gives you 42 points.</li>
        </ul>
        The leaderboard will reflect these metrics as the game progresses. Consider the various tradeoffs and choose wisely on what strategy you want to follow. The game is designed to be educational, so try different approaches and learn from them.

        <h2 className="text-xl" id="help"><a href="#help">Help</a></h2>
        <ul className="">
            <li>Are you getting exploited and want to see how? You may be able to figure it out through the pcaps that are being captured under /pcaps in your box.</li>
            <li>Did you get compromised or accidentally lost all your service files? You can find a copy of them under /home/ctf/backup and hopefully you can still restore service.</li>
            <li>Need help / have a question / wanna share ideas or provide commentary? You can follow the traditional route for such events, aka reach out to the #attack-defense channel on Discord. Mods should be responsive during "normal hours".</li>
        </ul>

        <h2 className="text-xl" id="fun"><a href="#fun">Last but not least: Have fun!!</a></h2>

      </div>
    </main>
  );
}
