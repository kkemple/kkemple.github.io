---
layout: post
title:  "Building A Marionette App with Flux Architecture"
categories: [backbone, marionette, flux, react, mvc, architecture, events]
---

Lately there has been a lot of talk about [Flux](https://facebook.github.io/flux/) and [React](http://facebook.github.io/react/). Rarely do you hear about one without the other, and I have to say that it bothers me.

Flux is an architectural pattern, a way to structure your app. React is a declaritive view library (don't get me started on my thoughts about calling React a framework). Although they play nicely with each other, there really is no direct connection. I think Facebook allowed React to steal the spotlight from what I believe to be the more important of the two, Flux.

For those of you unfamiliar with Flux, it is an architectural pattern that was created to solve the issue of event management. The theory is that by flowing all of the events created by the `view layer` (user interaction) or the `service` layer (HTTP, Sockets, Service Workers), that happen during the life-cycle of the app through a single `dispatcher`. That in turn passes the event on to `stores` (think Collections and Models), who in turn decide whether or not they care about the event. If they do, they will act upon it and then the `view layer` (in most examples this is React) will react to those changes.

The important part to note is that the `view layer` never sends events to the `stores`. This violates the uni-directional data flow that is at the heart of Flux. Every event is dispatched and picked up by the stores, who in turn updated the views.

```
Dispatcher -> Store -> View -> Dispatcher
```

I want to take a moment to focus on some of the terminology that Flux brings with it and explain how under the hood it really is not much different than anything else you may be familiar with already.

So let's start with the `dispatcher`. It serves two purposes, it provides a place for `stores` to register their listeners, and it dispatches events. This sounds like something we could build with [Backbone.Events](http://backbonejs.org/#Events) or [Backbone.Radio](https://github.com/marionettejs/backbone.radio).

> There is actually something I think fits a bit better, but we will worry about the implementation later.

So now let's discuss `stores`, what is a `store`'s purpose you ask? Well, it's purpose is to hold the state of your application and the current data associated with it. Hmmmm... sounds awfully familiar to me. Oh right, that sounds exactly like Models and Collections! I think we know what we can use to fill the role of a `store`.

Lastly we have the `view layer`. As mentioned above, this is usually React, and the functionality it provides is to give  `stores` a way to display it's data to a user, and force that display to update it's state when that data changes. I believe [Marionette](http://marionettejs.com/) provides great view functionality (not to mention a lot more) and it should work just fine for our `view layer`.

:clock10: TLDR;

> Let's write some code! &nbsp; :clap: :tada:


### Creating A Dispatcher

The first thing we need to do is create our dispatcher, this is the linchpin that binds the app together. (Nine stores, and in the dark, one dispatcher to bind them... sorry couldn't help myself :smile:)

{% highlight javascript %}
/* dispatcher.js */

'use strict';

var Marionette = require('backbone.marionette'),
    _ = require('underscore'),
    async = require('async'),
    Dispatcher;

Dispatcher = Marionette.Object.extend({
    initialize: function() {
        this.callbacks = [];
    },
    dispatch: function(evt) {
        var series = _(this.callbacks).map(function(fn) {
            return function(next) {
                var err = fn(evt);
                next(err ? err : null);
            };
        });

        async.series(series, function(err) {
            if (err) throw new Error(err);
        });
    },
    register: function(fn) {
        if (!_.isFunction(fn)) throw new Error('dispatcher only registers functions');
        this.callbacks.push(fn);
    }
});

module.exports = new Dispatcher();

{% endhighlight %}

As you can see, I chose to use `Marionette.Object` for this. Marionette.Object provides us with all the functionality we need to handle registering and executing callbacks, and it will be easy to extend if we want to add support for queueing/piping or ordering our registered callbacks. Some things to note about the `Dispatcher` are that all it does is take a list of callbacks and call them all everytime something "dispatches" an event.

> I did not implement the `waitFor` behavior that Facebook's version has, this is not overly difficult to do, but I did not want to clutter the focus of the example with the extra code required to accomplish that


### Creating a Store

Now let's work on creating a store, for this I am going to use `Backbone.Collection`. We will have to provide our dispatcher with a method to call when it receives an event, and then emit a change for any views that may be listening to this collection.

{% highlight javascript %}
/* todos.js */

'use strict';

var Backbone = require('backbone'),
    Todo = require('./todo'),
    dispatcher = require('./dispatcher'),
    Todos;

Todos = Backbone.Collection.extend({
    model: Todo,
    initialize: function() {
        dispatcher.register(this._processEvent.bind(this));
    },
    _processEvent: function(evt, next) {
        switch (evt.type) {
            case 'TODO_CREATE':
                this.create(evt.data);
                this.trigger('change');
                break;
            case 'TODO_UPDATE':
                this.at(evt.id)
                    .set(evt.data)
                    .save();
                this.trigger('change');
                break;
            case 'TODO_DELETE':
                this.at(evt.id).destroy();
                this.trigger('change');
                break;
        }
    }
});

module.exports = Todos;

{% endhighlight %}

Not much to making a store with a collection, Backbone has provided us with the functionality needed to make this work with very little effort. :cake: The important thing to notice is we only do any work if `evt.type` is one that our collection cares about.

> If we were to encounter an error we would want to return that error, this way we can stop the series from completing. Also this would be where we want to handle logging the error. Whether through the console in dev mode, or over the service layer for production.


### Creating the View Layer

Now we need a way to render our todo data to the user. Since we are using a `Backbone.Collection` for our store, it seems to make sense to use a `Marionette.CollectionView` to render our store's data, but we want a smart list view so we can have the functionality to add todos, so we will use a `Marionette.CompositeView`.

{% highlight javascript %}
/* todos.view.js */

'use strict';

var Marionette = require('backbone.marionette'),
    TodoStore = require('./todos'),
    TodoView = require('./todo.view'),
    dispatcher = require('./dispatcher'),
    TodosView;

TodosView = Marionette.CompositeView.extend({
    childView: TodoView,
    childViewContainer: '.todos',
    events: {
        'click .add-new': 'addTodo'
    },
    collectionEvents: {
        'change': '_onChange'
    },
    _onChange: function() {
        // respond to collection change
    },
    addTodo: function() {
        var formData = this.getFormData();
        dispatcher.dispatch({ type: 'TODO_CREATE', data: formData });
    },
    getFormData: function() {
        // ...
    }
});

module.exports = TodosView;

{% endhighlight %}

So now we can add a todo by dispatching a `TODO_CREATE` event and passing the relevent data. In most Marionette examples the `addTodo` method would probably call the collection directly creating a two-way data flow. By dispatching the event instead of directly updating the collection we make the view ignorant of the implementation of adding a todo. It simply broadcasts the event and relevent data. It does not care what happens afterwards.

> One thing to note is we should not get in the way of Marionette and the built in awesomeness it provides us. In other words, in our Store/Collection, when we delete a model, the `Marionette.ItemView` will be destroyed with it. This is a convenience provided to us by Marionette's `CollectionView`. This built in behavior is okay in our single direction data flow architecture because the view is not updating the model.

### Conclusion

Hopefully this helps you see that Flux/React is not some magical thing that will be a fix-all for your application. It is simply an architectural pattern with an accompanying declarative view library. If you are having trouble tracking the event flow of your application, or you find it hard to walk through different parts of your app, don't clear the board and start over, simply change how you handle data flow and follow those patterns all throughout your application. This will allow developers to navigate the code a little faster and give you better insight in to the actions happening in your application.

> Another thing to be aware of is that Flux/React is not an application solution. It does not provide you with all the features needed to create a client-side web app. Now this is not necessarily a bad thing, as it lets you pick the other pieces you need to build a fully featured app. With that said, it can be hard to tie all of those pieces together, that is why I find so much joy working with Marionette. It provides me with just enough to not have to build infrastucture, yet it is flexible enough to let me decide on architecture.





### #Update

In a comment below, jescalan, mentioned that the `_processEvent` method in the `Collection` above was a bit nasty. In my response I said that is in fact in a bit ugly, but only meant to be an example, and that honestly there was only a little you could do to clean it up. :-1: I was thinking in the context of still providing an example that would be a bit easier to understand for everyone, but by doing that I am really taking away from the power of Backbone and Marionette. They make it very easy to abstract away the mess. So to better answer his question about smoothing that part out. I would extend the `Collection` and abstract the entire checking process of the `evt.type` so we can add an object hash just like we do for `events` in our views.

### Creating A Better Store

The first thing we have to do is create our `Base Collection` that we will extend all of our application's collections.

{% highlight javascript %}
/* base.collection.js */

'use strict';

var Backbone = require('backbone'),
    dispatcher = require('./dispatcher'),
    BaseCollection;

BaseCollection = Backbone.Collection.extend({
    constructor: function() {
        dispatcher.register(this._processEvent.bind(this));
        Backbone.Collection.prototype.constructor.apply(this, arguments);
    },
    _processEvent: function(evt) {
        if (this.dispatcherEvents && this.dispatcherEvents[evt.type]) {
            var err = this.dispatcherEvents[evt.type](evt);
            if (!err) this.trigger('change');
            if (err) return err;
        }
    }
});

module.exports = BaseCollection;
{% endhighlight %}

Now that we can check for a `dispatcherEvents` hash in our collections we can have a nice clean API for registering to `dispatcher` events. This would look something like this:

### Using the Base Collection

{% highlight javascript %}
/* todos.js */

'use strict';

var BaseCollection = require('./base.collection'),
    Todo = require('./todo'),
    Todos;

Todos = BaseCollection.extend({
    model: Todo,
    dispatcherEvents: {
        'TODO_CREATE': createTodo,
        'TODO_UPDATE': updateTodo,
        'TODO_DELETE': deleteTodo
    },
    createTodo: function(evt) {
        this.create(evt.data);
    },
    updateTodo: function(evt) {
        this.at(evt.id).set(evt.data).save();
    },
    deleteTodo: function(evt) {
        this.at(evt.id).destroy();
    }
});

module.exports = Todos;

{% endhighlight %}

As you can see, this is a much cleaner solution to handling the dispatcher events flowing through the application.

Whether you :thumbsup: or :thumbsdown: this post, I would love to hear your opinion!
















