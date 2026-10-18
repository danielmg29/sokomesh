"""Seeded products (SM-F-22): listings written like a large marketplace's, with photo galleries.

Product.description is rich text (one of the specification's four rich-text fields), so each listing uses
what the backend's allow-list keeps: headings, lists, tables, captioned photographs, links and video
references. Photographs beyond each product's own cut-out are Unsplash photos (Unsplash License), linked
by address rather than copied and credited in their captions; videos are YouTube references, played through
the privacy-enhanced player only when a reader presses play. Brands, sellers and prices are invented; the
photographs and videos show the kind of product or dish, not these brands.
"""

from typing import Any

UNSPLASH = "https://images.unsplash.com/{id}?auto=format&fit=crop&w={w}&q=80"

# key: (Unsplash photo id, alt text, photographer, original width, original height)
PHOTOS: dict[str, tuple[str, str, str, int, int]] = {
    "ugali": (
        "photo-1666181551815-b9adecb24e46",
        "Ugali served with fried fish, kachumbari and greens",
        "Keesha's Kitchen",
        4037,
        2691,
    ),
    "maize_field": (
        "photo-1723645013435-c3c8948faf59",
        "A maize field in full leaf under a blue sky",
        "Gavin Allanwood",
        4027,
        2685,
    ),
    "maize_farmer": (
        "photo-1602867741746-6df80f40b3f6",
        "A farmer in a wide-brimmed hat walking through tall maize",
        "Erik",
        3024,
        4032,
    ),
    "maize_kernels": (
        "photo-1651667343153-6dc318e27e41",
        "A dried maize cob lying on loose yellow kernels",
        "Marek Studzinski",
        3456,
        5184,
    ),
    "maize_cobs": (
        "photo-1551754655-cd27e38d2076",
        "Fresh maize cobs with their husks peeled back",
        "Andre Ouellet",
        3000,
        2000,
    ),
    "pilau": (
        "photo-1634324092526-91f5e878b72f",
        "A platter of spiced rice with meat, carrots and garlic",
        "Eugene Krasnaok",
        5760,
        3840,
    ),
    "rice_raw": ("photo-1586201375761-83865001e31c", "Long white rice grains, close up", "Pierre Bamin", 5472, 3648),
    "rice_stalks": (
        "photo-1728895604559-a4e16081504e",
        "Rice heads ripening in a green paddy",
        "Declan Sun",
        11656,
        8742,
    ),
    "rice_paddy": (
        "photo-1774575902298-564503f168a7",
        "A farmer working a flooded rice paddy at sunset",
        "Pete Walls",
        4079,
        6118,
    ),
    "sugarcane": (
        "photo-1775619427924-16ff07cf2f2e",
        "A field of tall green sugarcane under a clear sky",
        "Ngoc Nguyen Phuong",
        4116,
        2636,
    ),
    "sugar_spoon": (
        "photo-1673791031093-eb8eefa60083",
        "A spoonful of granulated sugar on a dark table",
        "Immo Wegmann",
        6016,
        4000,
    ),
    "sugar_cubes": (
        "photo-1685967836908-7d3b4921a670",
        "Sugar cubes and a spoon of sugar on a red surface",
        "Elena Leya",
        5390,
        3593,
    ),
    "flatbread": (
        "photo-1708782343717-be4ea260249a",
        "Folded flatbreads on a white plate with dips",
        "Rimsha Noor",
        5000,
        5000,
    ),
    "griddle": (
        "photo-1754394483922-4d3a10cc6187",
        "A layered flatbread browning on a hot griddle",
        "Mugabi Owen",
        6000,
        4000,
    ),
    "roti_meal": (
        "photo-1576846806147-8065a16f89b0",
        "Flatbreads served with vegetables and sauce",
        "Viraj Sawant",
        4272,
        2848,
    ),
    "dough_rolling": (
        "photo-1517686469429-8bdb88b9f907",
        "Hands working dough beside a wooden rolling pin",
        "Nadya Spetnitskaya",
        5148,
        3432,
    ),
    "kneading": (
        "photo-1652283321082-72bb2b601abd",
        "Hands kneading a ball of dough on a floured table",
        "Skyler Ewing",
        5233,
        7850,
    ),
    "wheat": ("photo-1529511582893-2d7e684dd128", "Ripe wheat standing in a field", "Polina Rytova", 3339, 1876),
    "frying_pan": (
        "photo-1596522869169-95231d2b6864",
        "Golden snacks frying in a pan of hot oil",
        "Ashwini Chaudhary (Monty)",
        6000,
        3716,
    ),
    "fish_frying": (
        "photo-1645120091968-5f24af8eaff5",
        "A fish steak frying in a pan on the stove",
        "Collab Media",
        6720,
        4480,
    ),
    "chips_fryer": (
        "photo-1518207429941-5b17e09f4d86",
        "Potato chips cooking in a deep-fryer basket",
        "Wine Dharma",
        5184,
        3456,
    ),
    "oil_pour": (
        "photo-1768689033119-c3ac1e437d20",
        "Golden oil pouring from a metal spout",
        "Xavier von Erlach",
        6672,
        5281,
    ),
    "washing": (
        "photo-1723156716505-fefc66dfabc6",
        "A woman washing clothes by hand in a basin outdoors",
        "Colin White",
        3888,
        2592,
    ),
    "line_dry": (
        "photo-1466837581110-aeaa58fb562f",
        "Clean clothes drying on a line in the sun",
        "Jason Briscoe",
        5472,
        3648,
    ),
    "soap_bars": ("photo-1607006344152-62699f97b42c", "A stack of white soap bars", "Sincerely Media", 3456, 5184),
    "laundry_bucket": (
        "photo-1594758482685-aebc6dd855f3",
        "A woman carrying a bucket of washing",
        "Akhila Katuri",
        5958,
        3972,
    ),
    "tea_harvest": (
        "photo-1775573348847-4bd5d91b709e",
        "Workers picking tea on a hillside estate",
        "feifei liang",
        4896,
        2752,
    ),
    "tea_rows": ("photo-1593335663758-4da70281a917", "Rows of tea bushes along a slope", "Colin Roe", 4783, 3189),
    "tea_hills": ("photo-1455157823797-3019317cbcf0", "Tea estates on misty hills", "Ravi Pinisetti", 5616, 3744),
    "chai": ("photo-1633069683078-b180ba2afd89", "A hand holding a cup of milky tea", "Harshit Mahabale", 3024, 4032),
    "tea_glass": (
        "photo-1610137312679-8de3a836b455",
        "Black tea in a clear glass mug",
        "Lucas George Wendt",
        5836,
        3629,
    ),
    "milk_pour": ("photo-1550583724-b2692b85b150", "Milk being poured into a glass", "Eiliv Aceron", 4359, 6538),
    "milk_glass": (
        "photo-1611211301828-be4b317d0707",
        "Milk pouring into a drinking glass",
        "engin akyurt",
        2592,
        3888,
    ),
    "powder_scoop": ("photo-1693996046865-19217d179161", "A scoop of milk powder on a table", "Alex Saks", 4000, 2667),
    "warehouse": (
        "photo-1774946103680-3d34a461a581",
        "Stacked sacks and containers in a warehouse",
        "UZ Creative Services",
        3266,
        1837,
    ),
    "truck": (
        "photo-1783309529009-ba40108acbae",
        "Stacked bags on the back of a delivery truck",
        "Thilina Alagiyawanna",
        3079,
        2053,
    ),
}


def photo(key: str, width: int = 1600) -> dict[str, Any]:
    """A gallery image value: the URL at a display width, its true proportions, and the credit."""
    pid, alt, credit, w, h = PHOTOS[key]
    return {
        "url": UNSPLASH.format(id=pid, w=width),
        "alt": alt,
        "width": width,
        "height": round(width * h / w),
        "credit": f"Photo: {credit}, Unsplash",
    }


def figure(key: str, caption: str) -> str:
    pid, alt, credit, _, _ = PHOTOS[key]
    # In the text every photograph takes one landscape proportion, cropped by Unsplash around its subject.
    src = f"https://images.unsplash.com/{pid}?auto=format&fit=crop&crop=entropy&w=1200&h=750&q=80"
    return f'<figure class="image"><img src="{src}" alt="{alt}"><figcaption>{caption} Photo: {credit}, Unsplash.</figcaption></figure>'


def video(youtube_id: str, title: str, channel: str) -> str:
    return (
        f"<p><strong>Watch:</strong> {title}, from {channel} on YouTube.</p>"
        f'<figure class="media"><oembed url="https://www.youtube.com/watch?v={youtube_id}"></oembed></figure>'
    )


def specs(rows: list[tuple[str, str]]) -> str:
    body = "".join(f"<tr><th>{k}</th><td>{v}</td></tr>" for k, v in rows)
    return f"<table><tbody>{body}</tbody></table>"


def faq(pairs: list[tuple[str, str]]) -> str:
    return "<h3>Questions buyers ask</h3>" + "".join(f"<h4>{q}</h4><p>{a}</p>" for q, a in pairs)


MWANGAZA_DELIVERY = (
    "<li>From Mwangaza's warehouse on Lanet Road, Nakuru: Nakuru, Naivasha and Gilgil the next working day; "
    "Eldoret and Kericho on Tuesdays and Fridays.</li>"
    "<li>Orders confirmed before 14:00 leave the same day. Short deliveries are credited on the next invoice.</li>"
)
RIFT_DELIVERY = (
    "<li>Delivered from Eldoret, Monday to Saturday, across Uasin Gishu and Nandi.</li>"
    "<li>Quantity prices from 10 bales: ask Rift Valley Traders when you order.</li>"
)
PWANI_DELIVERY = (
    "<li>From Pwani's Mombasa depot: Mombasa, Kilifi and Kwale twice a week; Malindi and Lamu on request.</li>"
)

MAIZE_2KG = "".join(
    [
        "<p><strong>Mavuno is the everyday sifted maize flour your customers already ask for by name.</strong> "
        "It is milled from dried white maize and sifted fine for a smooth, firm ugali that holds together on the plate, "
        "then packed in the 2 kg packet most households buy for the week.</p>",
        "<h3>Why shops reorder it</h3><ul>"
        "<li><strong>A steady mover.</strong> Ugali is on the table most evenings, so the bale turns over week after week.</li>"
        "<li><strong>Fortified.</strong> Enriched with vitamin A, B vitamins, iron, zinc and folic acid, listed on every packet.</li>"
        "<li><strong>Even, fine texture.</strong> Careful sifting means fewer lumps and a white, smooth finish when cooked.</li>"
        "<li><strong>Bale-ready.</strong> Twelve packets shrink-wrapped into one 24 kg bale that stacks neatly on a pallet.</li>"
        "</ul>",
        figure("maize_farmer", "White maize, grown by smallholders and bought in after the harvest is dried."),
        "<h3>Specifications</h3>",
        specs(
            [
                ("Product", "Sifted white maize flour (unga wa ugali)"),
                ("Pack", "Bale of 12 packets × 2 kg, 24 kg net"),
                ("Fortification", "Vitamin A, vitamins B1, B2, B3, B6 and B12, folic acid, iron and zinc"),
                ("Shelf life", "6 months from milling; best-before date on every packet and the bale label"),
                ("Packaging", "Printed paper packets in clear shrink film"),
                ("Minimum order", "5 bales"),
            ]
        ),
        "<h3>Cooking it</h3><p>Bring salted water to the boil, add the flour a little at a time while stirring, then press "
        "and turn the dough with a wooden spoon until it is firm and comes away from the sides of the sufuria.</p>",
        video("tdZ0YhB8exE", "How to make ugali and sukuma wiki, a Kenyan cooking class", "Tasty Thrifty Timely"),
        figure("maize_field", "Grown, dried and milled before it reaches the bale."),
        "<h3>Delivery and storage</h3><ul>",
        MWANGAZA_DELIVERY,
        "<li>Store dry and off the floor on pallets, at most six bales high, away from damp walls.</li>"
        "<li>Sell the oldest stock first: the best-before date is printed on the bale label.</li></ul>",
        faq(
            [
                (
                    "Can I buy single packets?",
                    "Not on this listing, which sells whole bales from five. Smaller shops often "
                    'prefer the <a href="/products/mavuno-maize-flour-1kg">1 kg bale</a>.',
                ),
                (
                    "Is the flour the same in both sizes?",
                    "Yes. The 1 kg and 2 kg packets come from the same milling and sifting.",
                ),
            ]
        ),
    ]
)

MAIZE_1KG = "".join(
    [
        "<p><strong>The same Mavuno sifted maize flour, in 1 kg packets for smaller baskets.</strong> "
        "Kiosks and neighbourhood dukas sell the 1 kg packet fastest at the end of the month, when customers buy for a few days at a time.</p>",
        "<h3>Choose the right bale</h3>",
        "<table><thead><tr><th></th><th>1 kg bale (this listing)</th><th>2 kg bale</th></tr></thead><tbody>"
        "<tr><th>Packets</th><td>24 × 1 kg</td><td>12 × 2 kg</td></tr>"
        "<tr><th>Net weight</th><td>24 kg</td><td>24 kg</td></tr>"
        "<tr><th>Best for</th><td>Kiosks, daily shoppers, smaller households</td><td>Supermarkets, weekly family shopping</td></tr>"
        "<tr><th>Minimum order</th><td>5 bales</td><td>5 bales</td></tr>"
        '</tbody></table><p>See the <a href="/products/mavuno-maize-flour-2kg">2 kg bale</a> for larger baskets.</p>',
        figure("maize_cobs", "White maize, harvested and dried before milling."),
        "<h3>What is in every packet</h3><ul>"
        "<li>Finely sifted white maize flour for smooth ugali and uji.</li>"
        "<li>Fortified with vitamin A, B vitamins, iron, zinc and folic acid.</li>"
        "<li>Batch number and best-before date printed on the side.</li></ul>",
        video("Hb46QLpm2NU", "How to cook ugali", "Terry's Kitchen"),
        "<h3>Delivery and storage</h3><ul>",
        MWANGAZA_DELIVERY,
        "<li>Keep dry and off the floor; reseal opened bales so packets stay clean.</li></ul>",
    ]
)

RICE = "".join(
    [
        "<p><strong>Aromatic Pishori rice from the Mwea irrigation scheme</strong>, cleaned, graded and packed in strong "
        "woven 25 kg sacks. Long grains cook up separate and fragrant, which is why it is the rice families choose for "
        "pilau on Fridays, weddings and holidays.</p>",
        figure("rice_paddy", "Rice grows in flooded paddies; Mwea is fed by an irrigation scheme."),
        "<h3>Highlights</h3><ul>"
        "<li><strong>Fragrance.</strong> The natural aroma that gives Pishori its name, strongest in fresh-season stock.</li>"
        "<li><strong>Graded.</strong> Long grain with under 5% broken, machine-cleaned of stones and husk.</li>"
        "<li><strong>Sack strength.</strong> Woven polypropylene sacks with a stitched top survive loading and decanting.</li>"
        "<li><strong>Sells loose or packed.</strong> Decant into 1 kg and 2 kg bags or sell by the kilo from the open sack.</li>"
        "</ul>",
        "<h3>Specifications</h3>",
        specs(
            [
                ("Variety", "Pishori (Basmati 370 type), Mwea"),
                ("Grade", "Long grain, under 5% broken"),
                ("Pack", "One woven sack, 25 kg net"),
                ("Moisture", "Dried for storage; keeps 12 months sealed"),
                ("Minimum order", "2 sacks"),
            ]
        ),
        figure("rice_stalks", "Rice heads ripening in the paddy before harvest."),
        "<h3>Selling it by the kilo</h3><ol>"
        "<li>Open the sack along the stitched top and fold the edge down to keep it clean.</li>"
        "<li>Scoop with a dry measure and weigh in front of the customer.</li>"
        "<li>Keep the open sack covered and off the floor; finish it within a month.</li></ol>",
        video("EI8oenaXRp4", "How Kenyan rice is grown and harvested", "Kiran Jethwa: Fearless Food"),
        "<h3>Delivery and storage</h3><ul>",
        MWANGAZA_DELIVERY,
        "<li>Store sealed on pallets away from damp walls and strong smells such as paraffin and soap.</li></ul>",
        faq(
            [
                (
                    "Is this the same as imported basmati?",
                    "No. Pishori is grown in Kenya; it is aromatic like basmati but "
                    "has its own flavour, and many customers prefer it for pilau.",
                )
            ]
        ),
    ]
)

BROWN_SUGAR = "".join(
    [
        "<p><strong>Golden-brown mill sugar from western Kenya</strong>, in sealed 2 kg packets. Less refined than white "
        "sugar, it keeps a light caramel note that customers like in tea, uji and baking.</p>",
        "<h3>Why stock it</h3><ul>"
        "<li>The everyday sugar for chai in many homes, bought by the 2 kg packet.</li>"
        "<li>Sealed, printed packets that stay clean on the shelf and in the customer's bag.</li>"
        "<li>Ten packets to a bale: a manageable 20 kg for small shops.</li></ul>",
        figure("sugarcane", "Sugarcane, crushed and boiled at the mill to make brown sugar."),
        "<h3>Specifications</h3>",
        specs(
            [
                ("Product", "Brown mill sugar"),
                ("Pack", "Bale of 10 packets × 2 kg, 20 kg net"),
                ("Shelf life", "24 months sealed; best-before date on the packet"),
                ("Minimum order", "3 bales"),
            ]
        ),
        "<h3>From cane to packet</h3><p>Cane is crushed for its juice, which is clarified, boiled down until crystals form "
        "and spun to separate them. Brown sugar keeps some of the cane molasses that white sugar loses in refining.</p>",
        video("yrjdvJlUWJQ", "How sugar is made from sugarcane, inside a cane sugar factory", "Green Process Line"),
        figure("tea_glass", "Brown sugar sweetens the evening cup of tea in many homes."),
        "<h3>Delivery and storage</h3><ul>",
        MWANGAZA_DELIVERY,
        "<li>Keep dry: sugar draws moisture and sets hard in damp stores. Reseal opened bales.</li></ul>",
    ]
)

WHITE_SUGAR = "".join(
    [
        "<p><strong>Sukari Bora is clean white granulated sugar</strong>, packed in Eldoret in 1 kg packets, the size "
        "customers pick up with their bread and tea leaves.</p>",
        figure("sugar_spoon", "Fine white crystals that dissolve quickly in hot tea."),
        "<h3>At a glance</h3><ul>"
        "<li><strong>Fast seller.</strong> The 1 kg packet is the most common sugar purchase in neighbourhood shops.</li>"
        "<li><strong>Clean and dry.</strong> Free-flowing crystals in sealed packets.</li>"
        "<li><strong>Bale of 24.</strong> 24 kg per bale; quantity prices from 10 bales.</li></ul>",
        specs(
            [
                ("Product", "White granulated sugar"),
                ("Pack", "Bale of 24 packets × 1 kg, 24 kg net"),
                ("Shelf life", "24 months sealed"),
                ("Minimum order", "2 bales"),
            ]
        ),
        video("a4Nm-xpRFb8", "How sugar is made from sugarcane", "The Magical Engineering"),
        figure("chai", "In most homes it ends up in the evening chai."),
        "<h3>Delivery and storage</h3><ul>",
        RIFT_DELIVERY,
        "<li>Keep dry and away from strong smells; sugar picks up odours from soap and paraffin.</li></ul>",
    ]
)

FLOUR_2KG = "".join(
    [
        "<p><strong>Unga Bora is an all-purpose wheat flour made for soft, layered chapati and light mandazi.</strong> "
        "Enriched and finely milled, it kneads into a smooth, stretchy dough and browns evenly on the pan.</p>",
        figure("griddle", "A layered chapati browning on the pan."),
        "<h3>Why bakers and households choose it</h3><ul>"
        "<li><strong>Soft results.</strong> Good gluten for dough that rolls thin without tearing.</li>"
        "<li><strong>Versatile.</strong> Chapati, mandazi, pancakes, scones and everyday baking.</li>"
        "<li><strong>Enriched.</strong> Fortified with iron, zinc and B vitamins.</li>"
        "<li><strong>Kiosk-friendly bale.</strong> Ten 2 kg packets, 20 kg per bale.</li></ul>",
        "<h3>Specifications</h3>",
        specs(
            [
                ("Product", "All-purpose (home baking) wheat flour, enriched"),
                ("Pack", "Bale of 10 packets × 2 kg, 20 kg net"),
                ("Shelf life", "6 months from milling"),
                ("Minimum order", "5 bales"),
            ]
        ),
        "<h3>A typical chapati batch</h3>",
        "<table><thead><tr><th>Ingredient</th><th>For about 10 chapatis</th></tr></thead><tbody>"
        "<tr><td>Unga Bora baking flour</td><td>500 g</td></tr><tr><td>Warm water</td><td>About 300 ml</td></tr>"
        "<tr><td>Cooking oil</td><td>3 tablespoons, plus extra for the pan</td></tr><tr><td>Salt and sugar</td><td>1 teaspoon each</td></tr>"
        "</tbody></table>",
        video("Ih2Cg2PLFPI", "The secret to soft chapati with layers", "Jikoni"),
        figure("kneading", "Knead until the dough is smooth, then rest it before rolling."),
        "<h3>Delivery and storage</h3><ul>",
        RIFT_DELIVERY,
        "<li>Store cool and dry, off the floor; keep opened packets folded closed.</li></ul>",
        faq(
            [
                (
                    "Can it be used for bread?",
                    "It makes good home bread and buns. Commercial bakeries usually choose a "
                    "stronger bread flour for tin loaves.",
                )
            ]
        ),
    ]
)

FLOUR_1KG = "".join(
    [
        "<p><strong>Unga Bora baking flour in 1 kg packets</strong>: the same enriched all-purpose flour for chapati and "
        "mandazi, in the size customers buy for a single batch.</p>",
        figure("flatbread", "Folded chapatis, ready to serve."),
        "<h3>Good to know</h3><ul>"
        "<li>24 packets to a bale, 24 kg net.</li>"
        "<li>Fortified with iron, zinc and B vitamins.</li>"
        '<li>The <a href="/products/unga-bora-baking-flour-2kg">2 kg bale</a> suits shops with larger baskets.</li></ul>',
        video("UvgVw732ASg", "How to cook soft and layered Kenyan chapatis", "Asedo's Kitchen"),
        figure("dough_rolling", "Roll, oil and fold the dough for layers."),
        "<h3>Delivery and storage</h3><ul>",
        RIFT_DELIVERY,
        "<li>Store cool and dry.</li></ul>",
    ]
)

OIL_3L = "".join(
    [
        "<p><strong>Jua Gold is a refined vegetable cooking oil that stays clean and light through repeated frying.</strong> "
        "The 3 litre bottle is the favourite of chip vendors, mandazi sellers and large households.</p>",
        figure("chips_fryer", "Built for deep frying: chips, mandazi, samosas and fish."),
        "<h3>Why it sells</h3><ul>"
        "<li><strong>Light taste.</strong> A neutral flavour that lets the food lead.</li>"
        "<li><strong>Made for frying.</strong> Refined for a high smoke point and a clear, golden colour.</li>"
        "<li><strong>Cholesterol free</strong>, as plant oils are.</li>"
        "<li><strong>Tamper-evident caps</strong> and sturdy handled bottles that do not leak in the carton.</li></ul>",
        "<h3>Specifications</h3>",
        specs(
            [
                ("Product", "Refined vegetable cooking oil"),
                ("Pack", "Carton of 6 bottles × 3 litres"),
                ("Bottle", "PET with handle and tamper-evident cap"),
                ("Shelf life", "18 months unopened"),
                ("Minimum order", "1 carton"),
            ]
        ),
        video("9dfl7vZ7tFA", "How vegetable oil is made, from farm to factory", "Products Uncovered"),
        figure("oil_pour", "Clear, golden and free-pouring."),
        "<h3>Tips for food vendors</h3><ol>"
        "<li>Heat oil gradually and do not let it smoke.</li>"
        "<li>Strain out crumbs after each session so the oil lasts longer.</li>"
        "<li>Replace oil that has turned dark or foams.</li></ol>",
        "<h3>Delivery and storage</h3><ul>",
        PWANI_DELIVERY,
        "<li>Store bottles upright, out of direct sun and away from heat.</li></ul>",
    ]
)

OIL_1L = "".join(
    [
        "<p><strong>Jua Gold refined vegetable oil in 1 litre bottles</strong>: the everyday size for home cooking, from "
        "frying fish to stews and sukuma wiki.</p>",
        figure("fish_frying", "Shallow frying at home: the 1 litre bottle's daily work."),
        "<h3>Which size?</h3>",
        "<table><thead><tr><th></th><th>1 litre (this listing)</th><th>3 litres</th></tr></thead><tbody>"
        "<tr><th>Carton</th><td>12 bottles</td><td>6 bottles</td></tr>"
        "<tr><th>Litres per carton</th><td>12</td><td>18</td></tr>"
        "<tr><th>Best for</th><td>Home cooking, small shops</td><td>Food vendors, large households</td></tr>"
        "</tbody></table>"
        '<p>For frying in volume, see the <a href="/products/jua-gold-cooking-oil-3l">3 litre carton</a>.</p>',
        "<h3>Delivery and storage</h3><ul>",
        PWANI_DELIVERY,
        "<li>Store upright out of direct sun.</li></ul>",
    ]
)

SOAP = "".join(
    [
        "<p><strong>Safi is a hard laundry and multipurpose bar that lathers well even in hard water.</strong> Each 800 g "
        "bar is scored to cut into four, so shops can sell whole bars or quarters.</p>",
        figure("washing", "Hand washing: Safi is made for the basin and the scrubbing board."),
        "<h3>What customers get</h3><ul>"
        "<li><strong>Rich lather</strong> in hard and soft water alike.</li>"
        "<li><strong>Long-lasting bar</strong> that does not turn soft and wasteful in water.</li>"
        "<li><strong>One bar, many jobs:</strong> clothes, dishes, floors and hands.</li>"
        "<li><strong>Cut into four</strong> along the scored lines for quarter-bar sales.</li></ul>",
        "<h3>Specifications</h3>",
        specs(
            [
                ("Product", "Laundry and multipurpose bar soap"),
                ("Pack", "Carton of 25 bars × 800 g, 20 kg net"),
                ("Bar", "Scored into four pieces of 200 g"),
                ("Minimum order", "1 carton"),
            ]
        ),
        video("1kf2NRTlRfg", "How laundry bar soap is made", "Smartest Workers"),
        figure("line_dry", "Clean, fresh washing drying in the sun."),
        "<h3>Delivery and storage</h3><ul>",
        PWANI_DELIVERY,
        "<li>Keep the carton closed so bars do not dry out and crack; store away from food.</li></ul>",
        faq(
            [
                (
                    "Can I sell quarter bars?",
                    "Yes. Cut along the scored lines with a clean knife; each quarter weighs about 200 g.",
                )
            ]
        ),
    ]
)

TEA = "".join(
    [
        "<p><strong>Mlima is a strong Kenyan black CTC tea from the Kericho highlands</strong>, with the bright, coppery "
        "liquor and full body that make a proper cup of chai with milk and sugar.</p>",
        figure("tea_harvest", "Tea is picked by hand, two leaves and a bud at a time."),
        "<h3>Why it is a shelf staple</h3><ul>"
        "<li><strong>Strength.</strong> CTC granules brew quickly and stand up to milk.</li>"
        "<li><strong>Value per cup.</strong> A little goes a long way: about one teaspoon per cup.</li>"
        "<li><strong>Fresh-sealed.</strong> 500 g foil-lined packets keep the aroma in.</li></ul>",
        "<h3>Specifications</h3>",
        specs(
            [
                ("Product", "Black CTC tea, loose"),
                ("Origin", "Kericho highlands, Kenya"),
                ("Pack", "Carton of 20 packets × 500 g, 10 kg net"),
                ("Shelf life", "24 months sealed"),
                ("Minimum order", "1 carton"),
            ]
        ),
        "<h3>Making chai</h3><ol>"
        "<li>Bring equal parts water and milk to the boil.</li>"
        "<li>Add one teaspoon of Mlima per cup and simmer for two to three minutes.</li>"
        "<li>Sweeten to taste, strain and serve hot.</li></ol>",
        figure("chai", "Kenyan chai: strong tea, boiled with milk."),
        video("B-5ao1BCSd8", "Kericho, tea capital of Kenya", "Dennis Ohuru"),
        figure("tea_rows", "Tea bushes are kept at waist height for picking."),
        "<h3>Delivery and storage</h3><ul>",
        PWANI_DELIVERY,
        "<li>Store sealed, away from moisture and from spices, coffee and soap, whose smells tea absorbs.</li></ul>",
    ]
)

MILK = "".join(
    [
        "<p><strong>Maziwa is full-cream milk powder in resealable 400 g tins</strong>: milk for tea, porridge and "
        "baking that keeps without a fridge.</p>",
        figure("milk_pour", "Mixed with clean water, it makes full-cream milk for drinking or cooking."),
        "<h3>Why customers buy powder</h3><ul>"
        "<li>Keeps for months unopened, with no cold chain needed.</li>"
        "<li>Make as much or as little as needed.</li>"
        "<li>Rich, creamy taste in chai and uji.</li></ul>",
        specs(
            [
                ("Product", "Full-cream milk powder"),
                ("Pack", "Tray of 12 tins × 400 g"),
                ("Tin", "Resealable lid with a measuring scoop"),
                ("Shelf life", "18 months unopened; use within 4 weeks of opening"),
                ("Minimum order", "1 tray"),
            ]
        ),
        video("Dx76msi0Nv4", "How milk powder is made in a factory", "Uniqoo"),
        "<h3>Storage</h3><ul><li>Store cool and dry; close the lid tightly after use.</li>"
        "<li>Use a clean, dry scoop so the powder does not cake.</li></ul>",
    ]
)

# seller, category, name, slug, SKU, pack, price per pack, minimum order, cut-out, gallery, description.
PRODUCTS: list[dict[str, Any]] = [
    {
        "seller": "mwangaza",
        "category": "flour-grains",
        "name": "Mavuno Maize Flour 2 kg",
        "slug": "mavuno-maize-flour-2kg",
        "image": "maize",
        "gallery": ["ugali", "maize_kernels", "warehouse", "truck"],
        "description": MAIZE_2KG,
    },
    {
        "seller": "mwangaza",
        "category": "flour-grains",
        "name": "Mavuno Maize Flour 1 kg",
        "slug": "mavuno-maize-flour-1kg",
        "image": "maize",
        "gallery": ["ugali", "truck"],
        "description": MAIZE_1KG,
    },
    {
        "seller": "mwangaza",
        "category": "flour-grains",
        "name": "Mwea Pishori Rice 25 kg",
        "slug": "mwea-pishori-rice-25kg",
        "image": "rice",
        "gallery": ["pilau", "rice_raw", "warehouse", "truck"],
        "description": RICE,
    },
    {
        "seller": "mwangaza",
        "category": "sugar",
        "name": "Magharibi Brown Sugar 2 kg",
        "slug": "magharibi-brown-sugar-2kg",
        "image": "sugar",
        "gallery": ["sugar_spoon", "chai", "warehouse"],
        "description": BROWN_SUGAR,
    },
    {
        "seller": "rift",
        "category": "sugar",
        "name": "Sukari Bora Sugar 1 kg",
        "slug": "sukari-bora-sugar-1kg",
        "image": "sugar",
        "gallery": ["sugar_cubes", "sugarcane", "truck"],
        "description": WHITE_SUGAR,
    },
    {
        "seller": "rift",
        "category": "flour-grains",
        "name": "Unga Bora Baking Flour 2 kg",
        "slug": "unga-bora-baking-flour-2kg",
        "image": "flour",
        "gallery": ["flatbread", "wheat", "roti_meal", "warehouse"],
        "description": FLOUR_2KG,
    },
    {
        "seller": "rift",
        "category": "flour-grains",
        "name": "Unga Bora Baking Flour 1 kg",
        "slug": "unga-bora-baking-flour-1kg",
        "image": "flour",
        "gallery": ["griddle", "wheat", "truck"],
        "description": FLOUR_1KG,
    },
    {
        "seller": "pwani",
        "category": "cooking-oils",
        "name": "Jua Gold Cooking Oil 3 L",
        "slug": "jua-gold-cooking-oil-3l",
        "image": "oil",
        "gallery": ["frying_pan", "fish_frying", "warehouse"],
        "description": OIL_3L,
    },
    {
        "seller": "pwani",
        "category": "cooking-oils",
        "name": "Jua Gold Cooking Oil 1 L",
        "slug": "jua-gold-cooking-oil-1l",
        "image": "oil",
        "gallery": ["frying_pan"],
        "description": OIL_1L,
    },
    {
        "seller": "pwani",
        "category": "household",
        "name": "Safi Laundry Bar 800 g",
        "slug": "safi-laundry-bar-800g",
        "image": "soap",
        "gallery": ["soap_bars", "laundry_bucket", "warehouse"],
        "description": SOAP,
    },
    {
        "seller": "pwani",
        "category": "tea-beverages",
        "name": "Mlima Loose Tea 500 g",
        "slug": "mlima-loose-tea-500g",
        "image": "tea",
        "gallery": ["tea_hills", "tea_glass", "warehouse"],
        "description": TEA,
    },
    {
        "seller": "lakeside",
        "category": "dairy",
        "name": "Maziwa Milk Powder 400 g",
        "slug": "maziwa-milk-powder-400g",
        "image": "milk",
        "gallery": ["powder_scoop", "milk_glass", "chai"],
        "description": MILK,
    },
]
