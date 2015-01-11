;(function($, _, Backbone, lunr) {

    window.blog = window.blog || {};

    var TIMEOUT_ID = 0;

    var Posts = Backbone.Collection.extend({
        url: '/json/posts.json',
        initialize: function() {
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
                self.index.add(post);

                post.categories = post.categories.replace(/\s+/g, '').split(',');
            });

            return posts;
        },
        filter: function(term) {
            var self = this;

            var results = _(this.index.search(term)).map(function(r) {
                return self.get(r.ref);
            });

            return results;
        }
    });

    var SearchResult = Backbone.View.extend({
        template: _.template($('#search-result').html().trim()),
        render: function() {
            this.$el.html(this.template(this.model.attributes));
            return this;
        }
    });

    blog.posts = new Posts();
    blog.posts.fetch();

    var loadSearchResults = function(models) {
        var $results = $('.results').empty();

        if (!models.length) {
            $results.append($('<p class="note">No results found...</p>'));
        }

        _(models).each(function(m) {
            $results.append(new SearchResult({ model: m }).render().$el);
        });
    };

    $(function() {
        var $siteSearch = $('.site-search'),
            $showSearch = $('.show-search'),
            $closeSearch = $('.close-search');

        blog.$search = $('#search-container').scotchPanel({
            containerSelector: 'body',
            direction: 'right',
            duration: 300,
            transistion: 'ease',
            distanceX: '300px',
            enableEscapeKey: true
        });

        $showSearch.on('click', function(e) { e.preventDefault(); $siteSearch.val(''); blog.$search.toggle(); });
        $closeSearch.on('click', function(e) { e.preventDefault(); $siteSearch.val(''); blog.$search.close(); });

        $siteSearch.on('keyup change', function(e) {
            clearTimeout(TIMEOUT_ID);
            var $search = $(this);

            TIMEOUT_ID = setTimeout(function() {
                loadSearchResults(blog.posts.filter($search.val().trim()));
            }, 300);
        });

        emojify.setConfig({
            img_dir: '/img/emoji/'
        });

        emojify.run();
    });

})(jQuery, _, Backbone, lunr);