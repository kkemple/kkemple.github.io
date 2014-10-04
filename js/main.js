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
        parse: function(data) {
            var self = this;

            _(data.posts).each(function(post) {
                post.id = parseInt(post.id, 10);

                self.index.add(post);

                post.categories = post.categories.replace(/\s+/g, '').split(',');
            });

            return data.posts;
        },
        filter: function(term) {
            var self = this;

            var results = _(this.index.search(term)).map(function(r) {
                return self.get(parseInt(r.ref, 10));
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
        blog.$search = $('#search-container').scotchPanel({
            containerSelector: 'body',
            direction: 'right',
            duration: 300,
            transistion: 'ease',
            clickSelector: '.show-search',
            distanceX: '300px',
            enableEscapeKey: true
        });

        $('.close-search').on('click', function(e) { e.preventDefault(); blog.$search.close(); });

        $('.site-search').on('keyup change', function(e) {
            clearTimeout(TIMEOUT_ID);
            var $search = $(this);

            TIMEOUT_ID = setTimeout(function() {
                loadSearchResults(blog.posts.filter($search.val().trim()));
            }, 300);
        });
    });

})(jQuery, _, Backbone, lunr);