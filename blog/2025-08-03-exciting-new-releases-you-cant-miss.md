---
title: New Releases & More!
description: Discover the latest updates and releases in psake and PowerShellBuild that you won't want to miss!
date: 2025-08-03T23:38:05.100Z
slug: new-releases-and-more
authors:
  - heyitsgilbert
tags:
  - announcement
  - release
  - psake
  - powershell
  - build-automation
keywords:
  - psake
  - PowerShellBuild
  - build automation
  - PowerShell
  - release announcement
  - CI/CD
  - localization
image: /img/social-card.png
draft: false
fmContentType: blog
title_meta: August - New Releases and more!
---

It's been a while since our last update, and we've got some exciting news to
share! In this post, we'll cover recent releases, welcome new team members, and
highlight the various initiatives we're working on to make psake even better.

<!-- truncate -->

## Latest Versions

Since launching this documentation site, we haven't been great about announcing
new versions here. You could say we've been in stealth mode (though we're
definitely not that cool).

### psake

Back in October, we released psake 4.9.1, and since then we've merged several
pull requests, including some fantastic community contributions.

Check out the
[psake Changelog](https://github.com/psake/psake/blob/main/CHANGELOG.md) for all
the details.

The next release will introduce a new way to override the psake logging
mechanism. This will allow teams to integrate additional logging frameworks or
create improved CI/CD-specific workflows.

### PowerShellBuild

Just a few days ago, we updated PowerShellBuild - our collection of common tasks
for psake and Invoke-Build - to support overriding task dependencies. We also
added localization support (more on that below). This brings us to version 0.7.3
as our latest release. Since version 0.6.2, we've seen 4.5k downloads, and we
hope to keep improving the project based on your feedback.

See the
[PowerShellBuild Changelog](https://github.com/psake/PowerShellBuild/blob/main/CHANGELOG.md)
for complete details.

## Welcome Our Newest Team Members

You may have noticed them working on and reviewing code in our repositories, but
we'd like to formally welcome Joshua Hendricks and Trent Blackburn as new
members of the psake core team!

**Joshua** is our resident
[MVP](https://mvp.microsoft.com/MVP/profile/f98b4f3e-12fd-40de-bdce-1467f04d430d)
who's well-known for presenting at PowerShell + DevOps Global Summit on building
beautiful docs and sending notifications. He's a developer at Milestone Systems
where he maintains their PowerShell module.

**Trent** currently develops PowerShell automations at Tesla, previously
specialized in PowerShell at Amazon, and has also presented at the annual
PowerShell + DevOps Global Summit.

Both bring incredible expertise to the team, and we're excited to have them
aboard! If you're interested in contributing to psake, please consider opening
an issue or submitting a pull request—we'd love to hear from you.

## Expanding Global Accessibility with Localization

psake has long had the framework in place for supporting localization (l10n),
but until now has only been available in English. One of our key goals is making
psake as accessible as possible for users worldwide.

To make community contributions easier, we've set up a
[Crowdin project](http://crowdin.com/project/psake) that enables straightforward
translation requests and suggestions.

With the Crowdin project now live, we have a streamlined pipeline for
introducing new localized versions. We'd love your help in making psake
available in more languages - please consider contributing translations!
