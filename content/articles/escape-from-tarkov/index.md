---
title: 'Tarkov Community - What is this about?'
description: ''
date: '2023-05-20'
categories:
  - 'Projects'
keywords:
  - 'Projects'
  - 'Gaming'
  - 'JavaScript'
---

Hello there!

Tarkov is a shortened name of the video game [Escape From Tarkov](escapefromtarkov.com/), which is a hardcore tactical first-person extraction-based shooter. It's an incredibly difficult game with a huge learning curve - and also has communications issue between the developers and the community. The key issue is:

> The developers communicate important changes primarily through Twitter and occasional YouTube videos.

Which isn't ideal, because not everyone wants to get their updates on a video game through a separate social media platform.

## Now this is where we come in, I'm an avid gamer and I've spent a considerable amount of time in my life playing Tarkov. It's a fun game, but it's less fun trying to keep up when you're a casual gamer.

I think this is a more important

is a video game, one that I've spent a considerable amount of time watching, playing, working in and recommending. A friend of mine ThatFriendlyGuy originally had a super cool idea to build a single source of information!

This is where this idea comes in, and a bit of a project to play with new things!

The idea is for the website to be one singular location for official Tarkov news, and also provide some fun opportunities to play with APIs and get back into website engineering!

### Stage Uno

- I built a basic solution and UI using iFrames from Facebook + Twitter.
- I built a JS + CSS solution to dynamically alter the dropdown - but this was merged ux branch to base branch and didn't survive the purge.
- Started by building a very basic UI using iFrames.
- Custom-built a JS + CSS solution to dropdown the YouTube section to show latest video.

### Stage Drei

- I started using branches to separate master and development.
- In the UX branch I started templating the areas for Tweets, and built the dropdown solution.
- In the API branch I started to develop the YouTube API from scripts.
- I templated that we'd have the most recent video as the biggest that is an actual embedded player, with three thumbnails below.

- The API was fun to play with, the code was hardcoded but I ended up using function parameters and separating the logic.
- The JSON data is parsed into an object that is passed into a global array that can be called.

- I then moved onto Twitter API, and the free tier sucks and it's not worth trying to investigate.

### Stage Oh-No-I-Broke-It

- I went to merge the API and master branch, but unfortunately I made big oopsies and had some conflicts.
- I then ended up in some sort of infinite loop of merges due to the .gitignore.
- I eventually forced this through and just cleaned this up after in the master branch.

### Stage Lets-Fix-It

- I checked out a new dev branch, and we'll make sure we're not updating master directly.

- Cleaned up code and went to merge but ran into errors with the merge.
- I somehow completely ruined this and it was a constant loop of trying to fix conflicts.
- Eventually just forced this through and cleaned up the code on the master branch.

- Checked out a new dev branch which will be the branch to develop and stage on now.

- I then build the map with imagemaps and areas so they can be clicked on and bring up a Bootstrap Alert!

- The alerts plan is to be able to display events, such as end of wipe events

### Stage I'm coming back to this after 5 months

- Oh no, Twitter/X no longer has a free API and I can no longer pull the data so this kind of ruins my idea!
- Let's pivot this to more of a live tracker of events and direct to important resources it's going to be less techy and more frontend!

> Ah okay so I actually get to be more techy with this than expected honestly.

I removed the map completely because while it's a great idea, it'd be better if it was a region style. I had the original idea to build out the regions in a image manipulation app, then overlay them over the image as is, then do some fancy Javascript transaction BUT that's a lot of work for something that isn't given to us by the developers.

So they got yeeted in favour of having just buttons. I did play with a navbar but it didn't feel right, semantically it would make sense so maybe future iterations show that.

I built out an object in a JavaScript file for each map to make this dynamic. I think maybe doing this in a more dynamically generated language like React/Vite with Firebase or PouchDB (I also WatermelonDB) on the backend to store the data would be fun.

I've tried to move this more to a place to go for everything feel.

When events happen I'd like to have them display on the actual buttons sections, things like alerts? Or even cool overlays with snow type for Christmas!

Lots of ideas, but that means coming back to this within the next few months and uhhh yeah life and work comes first.

Till next time!
