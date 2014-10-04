---
layout: post
title:  "Setting Up Client-side Search for a Jekyll site with Lunr and Backbone"
categories: [github, blog, jekyll, lunr, search, static search]
---

So I just recently made the move to [Jekyll](http://jekyllrb.com/docs/home/) and Github Pages for hosting my blog. It is absolutely fantastic, but like anything else in the development world, it's not perfect right out of the box. One of the biggest issues is no search. Since the site is static and there is no database backing the content, we are left to create a fully client-side solution. This is where [lunr.js](http://lunrjs.com) steps in to save the day. Between that and [Backbone.js](http://backbonejs.org) we can set up a nice search for our blog.

Normally for a problem like this you could rely on a Jekyll plugin, however, Github builds your site with the `--safe` flag which won't run any plugins. There are two ways to deal with this. One is to only put the built site under version control and have Github host that. The other is to make Jekyll work like a plugin without being a plugin. We will implement the latter method with lunr.js, Backbone.js, and some sweet Jekyll manipulation.

> NOTE: This is not an intro to Jekyll, if you are not familiar with Front Matter, or other Jekyll conventions, this article may not be very useful to you.

### The Game Plan

There are a few things to do to get this to work:

- First thing is to get the title, excerpt, and categories of each post in to a JSON file so we can retrieve this information when we are ready to set up our index.
- Then we will build our Posts collection (tying in our lunr index) and Results view with Backbone.

### Getting Set Up

First thing is to make sure you have [lunr.js]() and [Backbone.js]() installed. Then we need to add a `post.json` file to our `_includes` directory. When we loop over our posts to get our post information, we will use this JSON template to store the information we need about each post. In `post.json` add the following:

{% highlight javascript %}
{% raw %}
{
    "id": "{{ forloop.index }}",
    "url": "{{ post.url }}",
    "title": "{{ post.title }}",
    "excerpt": " {{ post.excerpt | strip_html | strip_newlines | remove:'"' }}",
    "categories": "{% for category in post.categories %}{{ category }}{% unless forloop.last %}, {% endunless %}{% endfor %}"
}
{% endraw %}
{% endhighlight %}

While this is technically invalid JSON, once it is parsed by Jekyll, it will leave us with something like this:

{% highlight javascript %}
{
    "id": "1",
    "url": "/adding-site-search-with-lunr",
    "title": "Setting Up Client-side Search for a Jekyll site with lunr and Backbone",
    "excerpt": " So I just recently made the move to Jekyll and Github Pages for hosting my blog. It is absolutely fantastic, but like anything else in the development world, it’s not perfect right out of the box. One of the biggest issues is no search. Since the site is static and there is no database backing the content, we are left to create a fully client-side solution. This is where lunr.js steps in to save the day. Between that and Backbone.js we can set up a nice search for our blog.",
    "categories": "github, blog, jekyll, lunr, search, static search"
}
{% endhighlight %}

Now that we have our post template we need to add an actual `.json` file that we will have Jekyll parse to build out each post for us.

I added a `json/posts.json` file, feel free to place your file in any directory you choose. In `posts.json` we need to loop over all of our posts and include our `post.json` template, this will build out the final data we will load in to our Backbone `Posts` collection.

In `posts.json`:

{% highlight javascript %}
{% raw %}
---
---
[
    {% for post in site.posts %}
      {% include post.json %}{% unless forloop.last %},{% endunless %}
    {% endfor %}
]
{% endraw %}
{% endhighlight %}

Even though our Front Matter for this file is empty, Jekyll will still parse it and build out our posts JSON for us. The reason for using a JSON file is so we can load the data async, this could potentially get to be a large file and if we just built the loop in our default layout or in a JS file, the page would be held up until it loaded. Loading it async ensures the rest of site loads before the search data is loaded. This maybe could eventually be broken up by categories etc. but for now it should suffice as a single JSON file.

### Implementing the Backbone and Lunr Functionality

First let's build our `Posts` collection:

{% highlight javascript %}
var Posts = Backbone.Collection.extend({
    url: '/json/posts.json', // when we fetch, we get the JSON data Jekyll built for us
    initialize: function() {

        // here we create the index for the posts collection
        this.index = lunr(function() {
            this.field('title', {boost: 10});
            this.field('categories', {boost: 5});
            this.field('excerpt');
            this.ref('id')
        });
    },
    parse: function(posts) {
        var self = this;

        _(posts).each(function(post) {

            // add post to the lunr index
            self.index.add(post);

            // break categories apart for easier rendering in the template
            post.categories = post.categories.replace(/\s+/g, '').split(',');
        });

        // return our modified posts array
        return posts;
    },
    filter: function(term) {
        var self = this;

        // lunr returns an array of objects, we map over them and replace the lunr ref with the actual model
        var results = _(this.index.search(term)).map(function(r) {
            return self.get(r.ref);
        });

        // return the matching models from our collection
        return results;
    }
});
{% endhighlight %}

Cool, now that we have our `Posts` collection, let's set up a `Result` view that we will use to display our results. First let's set up the template:

{% highlight html %}
<script type="text/template" id="search-result">
  <div class="result">
    <h3><a href="<%= url %>"><%= title %></a></h3>
    <p><%= excerpt.substr(0, 120) + '...' %></p>
    <div class="categories">
      <% for (var i = 0; i < categories.length; i++) { %>
          <span class="category pill"><%= categories[i] %></span>
      <% } %>
    </div>
  </div>
</script>
{% endhighlight %}

This should be placed in a `layout` or `include` that is used on every page. Or you can load it with AJAX or build it right in your JS with a string.

Now that we have the template, let's build a Backbone view:

{% highlight javascript %}
var SearchResult = Backbone.View.extend({
    template: _.template($('#search-result').html().trim()),
    render: function() {
        this.$el.html(this.template(this.model.attributes));
        return this;
    }
});
{% endhighlight %}

Now let's instantiate our `Posts` collection and examine what it would look like to load a search query.

{% highlight javascript %}
var posts = new Posts();

posts.fetch().done(function() {
    $('.some-search-input').on('change', function() {
        var results = posts.filter($(this).val().trim()),
            $resultsContainer = $('.search-results').empty();

        _(results).each(function(r) {
            $resultsContainer.append(new SearchResult({model: r}).render().$el);
        });
    });
});
{% endhighlight %}

And that's it. Obviously there is a lot more that could be done, but this will give you a fast, full-site, client-side seach solution. And it's a relatively trivial amount of code to make it work.
