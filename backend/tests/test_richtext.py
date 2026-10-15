from core.richtext import LINK_REL, embed_for, sanitize

YOUTUBE = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"


def test_allowed_structure_survives():
    src = (
        "<h3>Storage</h3><p><strong>Keep dry</strong>, <em>cool</em>, <u>sealed</u> and <s>stacked</s> "
        "<code>max 6</code> high.</p><ul><li>One</li></ul><ol><li>Two</li></ol>"
        "<blockquote><p>Quote</p></blockquote><hr>"
    )
    assert sanitize(src).html == src


def test_scripts_styles_and_handlers_are_removed():
    out = sanitize(
        '<p onclick="x()">Hi<script>alert(1)</script><style>p{}</style></p><iframe src="https://evil"></iframe>'
    )
    assert out.html == "<p>Hi</p>"


def test_disallowed_tags_keep_their_text():
    assert sanitize("<div><span>Plain</span></div>").html == "Plain"


def test_links_get_rel_and_unsafe_schemes_are_dropped():
    assert (
        sanitize('<a href="https://soko.example/p">x</a>').html
        == f'<a href="https://soko.example/p" rel="{LINK_REL}">x</a>'
    )
    assert sanitize('<a href="javascript:alert(1)">x</a>').html == f'<a rel="{LINK_REL}">x</a>'


def test_images_load_over_https_or_from_this_origin():
    assert 'src="https://cdn.example/a.webp"' in sanitize('<img src="https://cdn.example/a.webp" alt="Bale">').html
    assert 'src="/media/a.webp"' in sanitize('<img src="/media/a.webp" alt="">').html
    for bad in ("http://cdn.example/a.webp", "//cdn.example/a.webp", "data:image/png;base64,AAAA", "javascript:x"):
        assert "src=" not in sanitize(f'<img src="{bad}" alt="x">').html


def test_figure_classes_are_limited_to_image_and_media():
    out = sanitize('<figure class="image wide"><img src="/m.webp" alt="Bale"><figcaption>Front</figcaption></figure>')
    assert out.html == '<figure class="image"><img src="/m.webp" alt="Bale"><figcaption>Front</figcaption></figure>'


def test_embeds_only_from_allow_listed_providers():
    good = f'<figure class="media"><oembed url="{YOUTUBE}"></oembed></figure>'
    assert sanitize(good).html == good
    assert sanitize('<figure class="media"><oembed url="https://evil.example/v/1"></oembed></figure>').html == ""
    assert embed_for(YOUTUBE) == {"name": "YouTube", "player": "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"}
    assert embed_for("https://vimeo.com/76979871") == {
        "name": "Vimeo",
        "player": "https://player.vimeo.com/video/76979871?dnt=1",
    }
    assert embed_for("https://www.youtube.com/watch?v=short") is None


def test_tables_survive_without_attributes():
    src = (
        "<table><thead><tr><th>Pack</th></tr></thead>"
        '<tbody><tr><td style="color:red" colspan="2">12 x 2 kg</td></tr></tbody></table>'
    )
    assert (
        sanitize(src).html
        == "<table><thead><tr><th>Pack</th></tr></thead><tbody><tr><td>12 x 2 kg</td></tr></tbody></table>"
    )


def test_plain_text_projection_separates_blocks():
    assert sanitize("<h3>Title</h3><p>One &amp; two</p><ul><li>A</li><li>B</li></ul>").text == "Title One & two A B"
