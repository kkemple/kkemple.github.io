---
layout: post
title:  "Faster Node-Webkit Development with Noops and Polyfills"
categories: [nodewebkit, velocity, productivity]
---

I recently started work on a [node-webkit](https://github.com/rogerwang/node-webkit) app called Lumberjack. It's purpose is to make tracking time against JIRA tasks easier. I at first made a SPA that needed a local server that you would start from the command line but this quickly became a hassle for anyone who wanted to use the app seriously. It requires a lot of additional steps and you have to remember to keep that terminal open. Also it was great for developers but there are co-workers who use JIRA that are not that command-line savy. That's when I decided I needed either a hosted solution (which is a bit overkill for the app), or something native. I am a JavaScript developer, so naturally I would pick something that lets me develop in my language. This is where node-webkit saved the day.

I was amazed at how easy it was to get up and running (I used the node-webkit [Yeoman](https://www.npmjs.org/package/generator-node-webkit) generator). Yet all was not right in the world, I had this awesome tool that allowed me to package a web app and run it on any OS, but every time I made a change I had to rebuild the app to view the outcome. Now waiting 30 seconds for the build to complete is not the end of the world but when you add up half a minute over hundreds of changes a day you can see the amount of time that is wasted. I am used to having auto-reload and quick builds so the constant waiting was very upsetting to me.

I started to think about the problem and something dawned on me. The amount of code that is node-webkit specific in the app is extremely small compared to the rest of the Angular SPA. I should be running this app in the browser for development and testing, but due to the node-webkit context specific code it was not possible. I needed a way to mock this functionality so that I could do continuous development in the browser and then turn on the node-webkit specific code when I added a new node-webkit feature and wanted to test it.

How can one accomplish such a task you ask? Well it's really quite simple. Since I use [Grunt](gruntjs.com) to build the app I would add a custom task to inject either my actual node-webkit code or some noops and polyfills to mock the node-webkit functionality.

The first thing I did was add a check for a `--browser` flag in my Gruntfile.

{% highlight javascript %}
var browser = (grunt.option('browser')) ? true : false;
{% endhighlight %}

Next I duplicated my `index.html` file and and renamed it to `index.html.tpl`. Once that was done I removed all node-webkit specific code from my index template and placed it in a file called `node-integration.tpl`. I then created a `browser-integration.tpl` file.

Since I was using Angular I could just create modules of the same names with the same functions in my browser file that existed in my node file. I would either alter the behavior to work in the browser or just noop the function so it didn't crash my application.

For data I simply stored results from the node calls in `json` files. I used `console.copy()` in combination with `JSON.stringify()` in order to get my data from node into a file within seconds. Easy peasy!!

Here is an example of the custom grunt task that builds my `index.html` file.

{% highlight javascript %}
var description = 'Depending on browser flag, build index file for node-webkit compatibility or browser compatibility';

grunt.registerTask('buildIndexFile', description, function() {

    var indexTpl = grunt.file.read('index.html.tpl');

    if (browser) {
        var browserTpl = grunt.file.read('browser-integration.tpl');

        indexTpl = indexTpl.replace('<!-- context integration -->', browserTpl);
    } else {
        var nodeTpl = grunt.file.read('node-integration.tpl');

        indexTpl = indexTpl.replace('<!-- context integration -->', nodeTpl);
    }

    grunt.file.write('index.html', indexTpl);
});
{% endhighlight %}

Then when I wanted to do a bunch of style updating or work on webkit/browser functionality I would simply run `grunt server --browser` and my custom grunt task would inject the browser safe code and I could develop most of my application without having to rebuild the node-webkit app every time I made a change. I can't express enough how much time this saved me and hopefully it will save you a ton of time as well.

If you have other ways you handle this I would love to hear them so drop a line in the comments below!

Happy coding!
