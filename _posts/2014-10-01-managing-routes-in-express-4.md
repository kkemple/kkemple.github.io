---
layout: post
title:  "Managing Routes in ExpressJS 4"
categories: [expressjs, architecture, routes]
---

Getting an [Express](http://expressjs.com/) app up and running is a very easy thing to do. It takes about 20 lines of code and you can then start a server and make requests. This is all good and well, but what happens when you have 100s of endpoints, a separate API, admin routes, and all of them need different middleware, validation, etc. Quickly you will find your code base starts to get complex and hard to work with. Let's cover a couple different ways to tackle this issue.

> NOTE: This article assumes you have an understanding of ExpressJS and working with restful APIs.


### Deciding On An Application Architecture

The first thing we need to do is decide how we plan to structure our routes. First lets cover the most common application setup and then we will take a look at how I feel it can be improved.

In a basic application you generally have something like the following:

{% highlight bash %}
myApp/
- config/
- controllers/
    user.js
- models/
    user.js
- routes/
    user.js
    auth.js
- lib/
    passport.js
- public/
app.js
server.js
{% endhighlight %}


And here is an example of setting up an application by components:

{% highlight bash %}
myApp/
- config/
- core/
  - user/
    - models/
        user.js
    - routes/
        auth.js
        user.js
    - controllers/
        user.js
        auth.js
    - lib/
        passport.js
- plugins/
  - somePlugin/
    - models/
    - routes/
    - controllers/
    - lib/
- lib/ => top level helper files, logger etc...
- public/
app.js
server.js
{% endhighlight %}

What this does is allow you to break your application up in to little pieces that are self contained and easier to work with. (This is my opinion, and you will find that there is a big debate around application architecture. This is my viewpoint and should in no way be taken as the defacto way of setting up your application.)


**Okay great, but what about working with routes and routers in Express?**

Right, we're almost there ;)

### Setting Up The Routes

First let's get the express app running:

{% highlight javascript %}
var express = require('express'),
    app = express();

app.get('/', function(req, res){
  res.send('Oh hey!');
});

var server = app.listen(3000, function() {
    console.log('Listening on port %d', 3000);
});
{% endhighlight %}

Now let's look at loading our routes, because we are using a component based application structure we can't just loop over a routes folder or require a single routes file. We will have routes in multiple directories, and we need a way to pull them in and add them to our app instance. We will use [shelljs](https://github.com/arturadib/shelljs) and regex for this.

{% highlight javascript %}
var express = require('express'),
    app = express(),
    shell = require('shelljs'),
    path = require('path');

var getFiles = function(dir, regex) {
    "use strict";

    return shell.find(path.resolve(__dirname, dir))
            .filter(function(file) { return file.match(regex); });
};

var routesRegex = /\/routes\/.+js$/;

var routes = getFiles('core', routesRegex).concat(getFiles('plugins', routesRegex));

routes.forEach(function(route) {
   app.use('/', require(route));
});

var server = app.listen(3000, function() {
    console.log('Listening on port %d', 3000);
});
{% endhighlight %}

A routes file might look like this:

{% highlight javascript %}
var express = require('express'),
    router = new express.Router(),
    controller = require('../controllers/user');

router.use(function(req, res, next) {
   // add your own middleware or use other middleware plugins
});

router.route('/admin/user')
    .get(controller.index)
    .post(controller.create);

router.route('/admin/user/:id')
    .get(controller.getById)
    .put(controller.update)
    .delete(controller.delete);

router.route('/admin/current/user')
    .get(controller.getCurrentUser);

module.exports = router;
{% endhighlight %}

This gives us a lot of freedom with how we structure our app and I wanted to use a component based architecture to show how easy Express makes it to add a router. Also to show how easy it is to extend something like this.

Let's say later on down the line we decide to add an API to our application, now we may have a structure like this:

{% highlight bash %}
myApp/
- config/
- core/
  - user/
    - api/
        user.js
    - models/
        user.js
    - routes/
        auth.js
        user.js
    - controllers/
        user.js
        auth.js
    - lib/
        passport.js
- plugins/
  - somePlugin/
    - api/
    - models/
    - routes/
    - controllers/
    - lib/
- lib/
- public/
app.js
server.js
{% endhighlight %}

We can easily accomodate an API with the following:

{% highlight javascript %}
var express = require('express'),
    app = express(),
    shell = require('shelljs'),
    path = require('path');

var getFiles = function(dir, regex) {
    "use strict";

    return shell.find(path.resolve(__dirname, dir))
            .filter(function(file) { return file.match(regex); });
};

var routesRegex = /\/routes\/.+js$/;
var apiRegex = /\/api\/.+js$/;

var routes = getFiles('core', routesRegex).concat(getFiles('plugins', routesRegex));

routes.forEach(function(route) {
   app.use('/', require(route));
});

var apiRoutes = getFiles('core', routesRegex).concat(getFiles('plugins', routesRegex));

apiRoutes.forEach(function(route) {
   app.use('/api/', require(route));
});

var server = app.listen(3000, function() {
    console.log('Listening on port %d', 3000);
});
{% endhighlight %}

And with just a few lines of code we have a new API that we can start adding routes to.

Hopefully this will show you how easy it can be to keep your routes under control, of course you can do something very similar with models.

