---
title: How to dummy up an Instagram’s API
---

# Broken heart
Hi, guys. Few month ago I started to work with Instagram API for my college project and I was disappointed a lot. Turned out, that Instagram has a special feature, called “Sandbox mode” and all of your apps are using this mode by default. It means, that you have only 500 requests/hour ~ 8 requests/minute; you have access only to basic info, like username, id, number of follower, etc. You can’t follow/unfollow, set likes, send comments, etc. You can’t even view list of followers! That sucks :C
If you want to get more abilities (they are called “Permissions”) you need to send your app for review. It says, that you need to record screencast(sic!) of working prototype, write a 500 pages essay about your goals and ambitions and much much more. So, at the first sight, you have no chances to develop anything good with Instagram API.

![Oh crap](https://cdn-images-2.medium.com/max/800/0*ilgl30Dlq3kaP7QO.jpg)

# A flash of hope
But I’ll teach you, how to dummy up Instagram. There will be 3 tricks:

1. Using some features of WEB interface of Instagram.
2. Using stolen access tokens
3. Using private API (HELL YEAH !).

# First technique. WEB interface trap-door.
As all of you know, Instagram was bought by Facebook a few years ago. So, now Instagram is developed by Facebook’s team, using of course some Facebook’s technologies. First of all — it’s React Framework. For those, who don’t now, it’s very cool JS tool, for developing awesome web-sites, but what is more important for us, is that React use client-side templating. So, when you are sending a request to, for example, Leo Messi’s Instagram, you’re getting a lot of HTML code, which is clear as mud, but somewhere inside, there is an inline script, like:

```html
<script> 
{"username" : "leomessi", "id" : "11223344", "is_private" : false, ...} 
</script>
```

So, all we need, is to extract content from this script. It’s easy to do, using Python and BeatifulSoup library. Example:

```python
import requests 
import json 
from bs4 import BeautifulSoup 
r = requests.get("https://www.instagram.com/leomessi/") 
html_code = t.text 
def extract_info_from_html(html): 
    soup = BeautifulSoup(html_code, 'html.parser') 
    script = soup.find_all('script')[6].string 
    script_data = json.loads(script[21:-1]) 
    user_data = script_data["entry_data"]["ProfilePage"][0]["user"]
    return user_data
print (extract_info_from_html(html_code))
```

That’s it. Now you have the basic info about the user, like counters of followings, followers, medias, list of first 12 medias, username, etc. Huge plus of this method, is that you have absolutly no limits. You can send thousands of requests 24/7 and Instagram will reply to all of them (Make an effort not to DDoS Instagram!).

# Second technique. Thug life.
Small intro
Easy to notice, that all you need for succesfull using Instagram’s API is access token. It’s a string like

```
3062014845.2974fce.f7861ce24f8b42e09db207b39b9151fa
```

which is necessary for API’s auth. It’s simple to get access token for your sandbox app (read the docs), but the problem is 500 r/h limit. If you can get access token for any “Live mode” app you will have 5000 r/h!

![No way](https://cdn-images-2.medium.com/max/800/0*cnWg_Ot9MSGcB6YR.jpg)

# God bless GET params
So, let’s do it. First of all let’s find an app, which is probably have “Live mode”. For example - extension for Chrome

1. Install it
2. Launch it
3. Click “Login”
4. Click “Authorize” on Instagram’s OAuth page and be attentive !1

If you were enough attentive, you may noticed, that Instagram have redirected you to some page and than close the tab. Restore this tab with CTRL+SHIFT+T (another way is to use “History”).
Now you’re on a tab with URL like

```
http://instagram.64px.com/#access_token=3104427830.2974fce.1bac839ee4794f3297305ff316e84229
```

Extract the access token and use it. That’s it! Now you have 5000 r/h and all of the permissions. So you can, for example, send 5000 requests on url like

```
https://api.instagram.com/v1/users/USER_ID/requested-by?access_token=ACCESS_TOKEN
```

and get the list of 250.000 Instagram’s users!

# Last technique. Very hacker, wow.

![hackerman](https://cdn-images-2.medium.com/max/800/0*LRAR8_mlyd5sDL6j.jpg)

I’ve wrote a wrapper for Instagram’s private API on Python. List of abilities:

- Upload photo with captions
- Get info about a user
- Get list of user’s medias (with pagination)
- Get list of user’s followers (with pagination)
- Get list of user’s followings (with pagination)
- Follow/unfollow users

Lib is fully open-source, do anything you want. Maybe one day I’ll wrote methods for liking or even direct messaging, but I’m not sure.
