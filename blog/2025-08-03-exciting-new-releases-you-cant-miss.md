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
title_meta: august-new-releases-and-more
---

It's been a while since our last update. In this post we'll be covering some of
the most recent releases, some new team members, and different efforts we're
taking on.

<!-- truncate -->

## Latest Versions

Since initially rolling out this docs site we haven't really announced any
versions through here. We could say we've been in stealth mode (but we're not
that cool).

### psake

Back in October we released psake 4.9.1, and since then have landed a few PR's
including a few community contributions.

See the
[psake Changelog](https://github.com/psake/psake/blob/main/CHANGELOG.md) for all
the details.

The next release should introduce a new way to overwrite the psake logging
mechanism. This would allow teams to hook in additionally logging frameworks or
improve CI/CD specific flows.

### PowerShellBuild

Two days ago PowerShellBuild, our set of common tasks for psake and Invoke-Build
was updated to support overriding the task dependencies. We also added support
for localization (see below). This brings us up to version 0.7.3 as the latest
release. Since 0.6.2 we've had 4.5k downloads and we're hope to continue to
improve the project.

See the
[PowerShellBuild Changelog](https://github.com/psake/PowerShellBuild/blob/main/CHANGELOG.md)
for all the details.

## Newest Team Members

You may have noticed them working or reviewing code in our repositories, but I'd
like to formally announce Joshua Hendricks and Trent Blackburn as members to the
psake core team.

If you're interested in contributing, please consider opening an issue and/or a
PR.

## Localization

psake has long had the framework set for supporting localization (aka l10n), but
has only had one language implemented (English). One of our goals is to make
psake as accessible as possible for all users.

To make it easier for the community we've configured a
[CrowdIn project](http://crowdin.com/project/psake) that allows for easy
translation requests and suggestions.

With the CrowdIn project in place we now have a simple pipeline to introduce new
localized versions. Please consider suggesting!
