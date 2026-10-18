"""The demo catalogue's structure: category contracts (SM-F-03), each product's attributes and variants
(SM-F-04), more products for search and paging (SM-F-08), a cart that needs repricing (SM-F-10) and order
history to reorder from (SM-F-20). Prices are invented but realistic for Kenyan wholesale in 2026.

Listings for the first twelve products are in apps/demo/products.py; the further products here use a
shorter listing built from their facts, still in the rich-text shape the allow-list keeps.
"""

from typing import Any

from apps.demo.products import MWANGAZA_DELIVERY, PWANI_DELIVERY, RIFT_DELIVERY, faq, specs


def choices(*pairs: tuple[str, str]) -> list[dict[str, str]]:
    return [{"value": v, "label": label} for v, label in pairs]


ORIGIN = choices(("kenya", "Kenya"), ("east_africa", "East Africa"), ("imported", "Imported"))

# --- category contracts -------------------------------------------------------------------------

FLOUR_V1: dict[str, Any] = {
    "attribute_schema": [
        {
            "key": "grain",
            "label": "Grain",
            "type": "enum",
            "required": True,
            "choices": choices(("maize", "Maize"), ("wheat", "Wheat"), ("rice", "Rice")),
        },
        {
            "key": "milling",
            "label": "Milling",
            "type": "enum",
            "required": True,
            "choices": choices(
                ("sifted", "Sifted"),
                ("whole_meal", "Whole meal"),
                ("all_purpose", "All-purpose"),
                ("self_raising", "Self-raising"),
                ("whole_grain", "Whole grain"),
            ),
        },
        {
            "key": "unit_size",
            "label": "Packet or sack size",
            "type": "decimal",
            "unit": "kg",
            "required": True,
            "min": 0.25,
            "max": 90,
            "help": "What one packet or sack weighs.",
        },
        {
            "key": "fortified",
            "label": "Fortified",
            "type": "boolean",
            "help": "Vitamins and minerals added, as KEBS requires for maize and wheat flour.",
        },
    ],
    "unit_rules": {"sale_units": ["bale", "sack"], "normalise": {"attribute": "unit_size", "per": "kg", "factor": 1}},
    "facet_keys": ["grain", "milling", "unit_size", "fortified"],
    "comparison_keys": ["grain", "milling", "unit_size", "fortified"],
    "display_recipe": {
        "card_keys": ["unit_size", "milling"],
        "spec_keys": ["grain", "milling", "unit_size", "fortified"],
    },
}
FLOUR_V2: dict[str, Any] = {
    **FLOUR_V1,
    "attribute_schema": [
        *FLOUR_V1["attribute_schema"],
        {"key": "origin", "label": "Grown in", "type": "enum", "required": True, "choices": ORIGIN},
        {
            "key": "shelf_life_months",
            "label": "Shelf life",
            "type": "integer",
            "unit": "months",
            "min": 1,
            "max": 36,
            "help": "From milling or packing to the best-before date.",
        },
    ],
    "facet_keys": ["grain", "milling", "unit_size", "fortified", "origin"],
    "comparison_keys": ["grain", "milling", "unit_size", "fortified", "shelf_life_months", "origin"],
    "display_recipe": {
        "card_keys": ["unit_size", "milling"],
        "spec_keys": ["grain", "milling", "unit_size", "fortified", "origin", "shelf_life_months"],
    },
}
SUGAR: dict[str, Any] = {
    "attribute_schema": [
        {
            "key": "sugar_type",
            "label": "Sugar",
            "type": "enum",
            "required": True,
            "choices": choices(("white", "White"), ("brown", "Brown")),
        },
        {
            "key": "crystal",
            "label": "Crystal",
            "type": "enum",
            "choices": choices(("fine", "Fine"), ("regular", "Regular"), ("coarse", "Coarse")),
        },
        {
            "key": "unit_size",
            "label": "Packet or sack size",
            "type": "decimal",
            "unit": "kg",
            "required": True,
            "min": 0.25,
            "max": 90,
        },
        {"key": "origin", "label": "Milled in", "type": "enum", "required": True, "choices": ORIGIN},
    ],
    "unit_rules": {"sale_units": ["bale", "sack"], "normalise": {"attribute": "unit_size", "per": "kg", "factor": 1}},
    "facet_keys": ["sugar_type", "unit_size", "origin"],
    "comparison_keys": ["sugar_type", "crystal", "unit_size", "origin"],
    "display_recipe": {
        "card_keys": ["unit_size", "sugar_type"],
        "spec_keys": ["sugar_type", "crystal", "unit_size", "origin"],
    },
}
OIL: dict[str, Any] = {
    "attribute_schema": [
        {
            "key": "oil_type",
            "label": "Oil",
            "type": "enum",
            "required": True,
            "choices": choices(
                ("vegetable", "Vegetable blend"),
                ("sunflower", "Sunflower"),
                ("palm_olein", "Palm olein"),
                ("corn", "Corn"),
            ),
        },
        {
            "key": "unit_volume",
            "label": "Bottle or jerrycan size",
            "type": "decimal",
            "unit": "L",
            "required": True,
            "min": 0.25,
            "max": 25,
        },
        {
            "key": "container",
            "label": "Container",
            "type": "enum",
            "required": True,
            "choices": choices(("bottle", "Bottle"), ("jerrycan", "Jerrycan"), ("pouch", "Pouch")),
        },
        {"key": "fortified", "label": "Vitamins A and D added", "type": "boolean"},
        {"key": "cholesterol_free", "label": "Cholesterol free", "type": "boolean"},
    ],
    "unit_rules": {
        "sale_units": ["carton", "case", "jerrycan"],
        "normalise": {"attribute": "unit_volume", "per": "litre", "factor": 1},
    },
    "facet_keys": ["oil_type", "unit_volume", "container", "fortified"],
    "comparison_keys": ["oil_type", "unit_volume", "container", "fortified", "cholesterol_free"],
    "display_recipe": {
        "card_keys": ["unit_volume", "oil_type"],
        "spec_keys": ["oil_type", "unit_volume", "container", "fortified", "cholesterol_free"],
    },
}
TEA_V1: dict[str, Any] = {
    "attribute_schema": [
        {
            "key": "beverage",
            "label": "Tea",
            "type": "enum",
            "required": True,
            "choices": choices(("black_tea", "Black tea"), ("green_tea", "Green tea")),
        },
        {
            "key": "form",
            "label": "Form",
            "type": "enum",
            "required": True,
            "choices": choices(("loose", "Loose leaf"), ("bags", "Tea bags"), ("dust", "Dust")),
        },
        {
            "key": "unit_weight",
            "label": "Packet weight",
            "type": "decimal",
            "unit": "g",
            "required": True,
            "min": 25,
            "max": 5000,
            "help": "For tea bags, the weight of all the bags in one box.",
        },
        {
            "key": "region",
            "label": "Grown in",
            "type": "enum",
            "choices": choices(
                ("kericho", "Kericho"),
                ("nandi", "Nandi Hills"),
                ("nyeri", "Nyeri"),
                ("kisii", "Kisii"),
                ("meru", "Meru"),
            ),
        },
    ],
    "unit_rules": {
        "sale_units": ["carton", "case", "pack"],
        "normalise": {"attribute": "unit_weight", "per": "kg", "factor": 0.001},
    },
    "facet_keys": ["beverage", "form", "region", "unit_weight"],
    "comparison_keys": ["beverage", "form", "unit_weight", "region"],
    "display_recipe": {
        "card_keys": ["unit_weight", "form"],
        "spec_keys": ["beverage", "form", "unit_weight", "region"],
    },
}
TEA_V2_DRAFT: dict[str, Any] = {
    **TEA_V1,
    "attribute_schema": [
        *TEA_V1["attribute_schema"],
        {
            "key": "grade",
            "label": "Grade",
            "type": "enum",
            "choices": choices(("bp1", "BP1"), ("pf1", "PF1"), ("pd", "PD"), ("dust1", "Dust 1")),
            "help": "The auction grade, for loose tea and dust.",
        },
    ],
    "comparison_keys": ["beverage", "form", "grade", "unit_weight", "region"],
}
HOUSEHOLD: dict[str, Any] = {
    "attribute_schema": [
        {
            "key": "product_type",
            "label": "Type",
            "type": "enum",
            "required": True,
            "choices": choices(
                ("laundry_bar", "Laundry bar"), ("multipurpose", "Multipurpose bar"), ("bath_soap", "Bath soap")
            ),
        },
        {
            "key": "unit_weight",
            "label": "Bar weight",
            "type": "decimal",
            "unit": "g",
            "required": True,
            "min": 50,
            "max": 2000,
        },
        {
            "key": "scent",
            "label": "Scent",
            "type": "enum",
            "choices": choices(
                ("unscented", "Unscented"), ("lemon", "Lemon"), ("herbal", "Herbal"), ("fresh", "Fresh")
            ),
        },
        {
            "key": "colour",
            "label": "Colour",
            "type": "enum",
            "variant": True,
            "choices": choices(("green", "Green"), ("white", "White"), ("blue", "Blue"), ("tan", "Tan")),
        },
    ],
    "unit_rules": {
        "sale_units": ["carton", "case"],
        "normalise": {"attribute": "unit_weight", "per": "kg", "factor": 0.001},
    },
    "facet_keys": ["product_type", "scent", "colour", "unit_weight"],
    "comparison_keys": ["product_type", "unit_weight", "scent"],
    "display_recipe": {
        "card_keys": ["unit_weight", "product_type"],
        "spec_keys": ["product_type", "unit_weight", "scent"],
    },
}
DAIRY: dict[str, Any] = {
    "attribute_schema": [
        {
            "key": "dairy_type",
            "label": "Product",
            "type": "enum",
            "required": True,
            "choices": choices(("milk_powder", "Milk powder"), ("tea_whitener", "Tea whitener")),
        },
        {
            "key": "fat",
            "label": "Fat",
            "type": "enum",
            "required": True,
            "choices": choices(("full_cream", "Full cream"), ("skimmed", "Skimmed"), ("fat_filled", "Fat-filled")),
        },
        {
            "key": "unit_weight",
            "label": "Pack weight",
            "type": "decimal",
            "unit": "g",
            "required": True,
            "min": 25,
            "max": 2500,
        },
        {
            "key": "container",
            "label": "Container",
            "type": "enum",
            "choices": choices(("tin", "Tin"), ("sachet", "Sachet"), ("pouch", "Pouch")),
        },
    ],
    "unit_rules": {
        "sale_units": ["carton", "tray", "case"],
        "normalise": {"attribute": "unit_weight", "per": "kg", "factor": 0.001},
    },
    "facet_keys": ["dairy_type", "fat", "container"],
    "comparison_keys": ["dairy_type", "fat", "unit_weight", "container"],
    "display_recipe": {
        "card_keys": ["unit_weight", "fat"],
        "spec_keys": ["dairy_type", "fat", "unit_weight", "container"],
    },
}

GUIDANCE = {
    "flour-grains": (
        "<p>List each packet size as its own product, and each way you pack it as a variant.</p><ul>"
        "<li><strong>Size:</strong> the weight of one packet or sack, not the bale.</li>"
        "<li><strong>Fortified:</strong> tick it only if the packet carries the KEBS fortification logo.</li>"
        "<li><strong>Shelf life:</strong> months from milling to the best-before date on the packet.</li></ul>",
        "<p>A bale of 12 × 2 kg and a bale of 24 × 1 kg both weigh 24 kg. Compare <strong>prices per kg</strong> "
        "to see which works out cheaper for your shop.</p>",
    ),
    "sugar": (
        "<p>State whether the sugar is white or brown and where it was milled; imported sugar must say so.</p>",
        "<p>Sugar sold by the 50 kg sack is usually cheapest per kg but needs dry storage off the floor.</p>",
    ),
    "cooking-oils": (
        "<p>Give the size of one bottle or jerrycan in litres. Tick vitamins A and D only if the label says so.</p>",
        "<p>Jerrycans suit kiosks that decant; bottles sell faster on supermarket shelves.</p>",
    ),
    "tea-beverages": (
        "<p>For tea bags, enter the weight of a whole box (100 bags of 2 g is 200 g) so prices per kg compare fairly.</p>",
        "<p>Kenyan black tea is graded at the Mombasa auction; dust and fannings brew strong and fast for chai.</p>",
    ),
    "household": (
        "<p>Each colour or scent you sell is a variant of the same bar; give each its own SKU.</p>",
        "<p>Laundry bars are priced per carton; compare per kg when bar weights differ.</p>",
    ),
    "dairy": (
        "<p>Say whether milk powder is full cream or fat-filled; fat-filled powder must be labelled as such.</p>",
        "<p>Sachets suit daily shoppers; tins keep longer once opened.</p>",
    ),
}

# Category slug -> versions in order: (definition, status). Products use the published version.
CONTRACTS: dict[str, list[tuple[dict[str, Any], str]]] = {
    "flour-grains": [(FLOUR_V1, "retired"), (FLOUR_V2, "published")],
    "sugar": [(SUGAR, "published")],
    "cooking-oils": [(OIL, "published")],
    "tea-beverages": [(TEA_V1, "published"), (TEA_V2_DRAFT, "draft")],
    "household": [(HOUSEHOLD, "published")],
    "dairy": [(DAIRY, "published")],
}


# --- variants: sku, sale unit, units per pack, minimum order, price, packs in stock (None: not tracked) ---


def v(sku: str, unit: str, per: float, moq: int, price: str, stock: int | None, **attributes: str) -> dict[str, Any]:
    return {"sku": sku, "unit": unit, "per": per, "moq": moq, "price": price, "stock": stock, "attributes": attributes}


# Attributes, variants, brand and summary for the products listed in apps/demo/products.py.
COMMERCE: dict[str, dict[str, Any]] = {
    "mavuno-maize-flour-2kg": {
        "brand": "Mavuno",
        "short": "Sifted, fortified maize flour for smooth ugali, in the 2 kg packet most households buy for the week.",
        "attributes": {
            "grain": "maize",
            "milling": "sifted",
            "unit_size": 2,
            "fortified": True,
            "origin": "kenya",
            "shelf_life_months": 6,
        },
        "variants": [v("MVN-2K-12", "bale", 12, 5, "1740.00", 180)],
    },
    "mavuno-maize-flour-1kg": {
        "brand": "Mavuno",
        "short": "The same sifted Mavuno flour in 1 kg packets, the size kiosks sell fastest.",
        "attributes": {
            "grain": "maize",
            "milling": "sifted",
            "unit_size": 1,
            "fortified": True,
            "origin": "kenya",
            "shelf_life_months": 6,
        },
        "variants": [v("MVN-1K-24", "bale", 24, 5, "1820.00", 95)],
    },
    "mwea-pishori-rice-25kg": {
        "brand": "Mwea",
        "short": "Aromatic Pishori rice from the Mwea irrigation scheme, cleaned and graded in 25 kg sacks.",
        "attributes": {
            "grain": "rice",
            "milling": "whole_grain",
            "unit_size": 25,
            "fortified": False,
            "origin": "kenya",
            "shelf_life_months": 18,
        },
        "variants": [v("MWP-25K-01", "sack", 1, 2, "4850.00", 60)],
    },
    "magharibi-brown-sugar-2kg": {
        "brand": "Magharibi",
        "short": "Golden brown sugar from western Kenya cane, in 2 kg packets baled in tens.",
        "attributes": {"sugar_type": "brown", "crystal": "regular", "unit_size": 2, "origin": "kenya"},
        "variants": [v("MGB-2K-10", "bale", 10, 3, "3150.00", 0)],
    },
    "sukari-bora-sugar-1kg": {
        "brand": "Sukari Bora",
        "short": "Fine white sugar that dissolves fast in tea, in 1 kg packets.",
        "attributes": {"sugar_type": "white", "crystal": "fine", "unit_size": 1, "origin": "kenya"},
        "variants": [v("SKB-1K-24", "bale", 24, 2, "3960.00", 70)],
    },
    "unga-bora-baking-flour-2kg": {
        "brand": "Unga Bora",
        "short": "All-purpose wheat flour for chapati, mandazi and home baking, fortified, in 2 kg packets.",
        "attributes": {
            "grain": "wheat",
            "milling": "all_purpose",
            "unit_size": 2,
            "fortified": True,
            "origin": "kenya",
            "shelf_life_months": 9,
        },
        "variants": [v("UBF-2K-10", "bale", 10, 5, "1690.00", 120)],
    },
    "unga-bora-baking-flour-1kg": {
        "brand": "Unga Bora",
        "short": "Unga Bora all-purpose flour in 1 kg packets for smaller baskets.",
        "attributes": {
            "grain": "wheat",
            "milling": "all_purpose",
            "unit_size": 1,
            "fortified": True,
            "origin": "kenya",
            "shelf_life_months": 9,
        },
        "variants": [v("UBF-1K-24", "bale", 24, 5, "1780.00", None)],
    },
    "jua-gold-cooking-oil-3l": {
        "brand": "Jua Gold",
        "short": "Fortified vegetable cooking oil in 3 L bottles, six to a carton.",
        "attributes": {
            "oil_type": "vegetable",
            "unit_volume": 3,
            "container": "bottle",
            "fortified": True,
            "cholesterol_free": True,
        },
        "variants": [v("JUA-3L-06", "carton", 6, 1, "5220.00", 34)],
    },
    "jua-gold-cooking-oil-1l": {
        "brand": "Jua Gold",
        "short": "Jua Gold vegetable oil in 1 L bottles, by the carton of 12 or 24.",
        "attributes": {
            "oil_type": "vegetable",
            "unit_volume": 1,
            "container": "bottle",
            "fortified": True,
            "cholesterol_free": True,
        },
        "variants": [v("JUA-1L-12", "carton", 12, 1, "3480.00", 52), v("JUA-1L-24", "carton", 24, 1, "6840.00", 12)],
    },
    "safi-laundry-bar-800g": {
        "brand": "Safi",
        "short": "A hard-wearing 800 g laundry bar that lathers in hard water, in green or white.",
        "attributes": {"product_type": "laundry_bar", "unit_weight": 800, "scent": "fresh"},
        "variants": [
            v("SFI-800-25", "carton", 25, 1, "4375.00", 40, colour="green"),
            v("SFI-800-25W", "carton", 25, 1, "4375.00", 6, colour="white"),
        ],
    },
    "mlima-loose-tea-500g": {
        "brand": "Mlima",
        "short": "Strong Kericho black tea, loose, in 500 g packets for chai.",
        "attributes": {"beverage": "black_tea", "form": "loose", "unit_weight": 500, "region": "kericho"},
        "variants": [v("MLM-500-20", "carton", 20, 1, "6400.00", 25), v("MLM-500-05", "pack", 5, 2, "1650.00", 40)],
    },
    "maziwa-milk-powder-400g": {
        "brand": "Maziwa",
        "short": "Full-cream milk powder in 400 g tins, twelve to a tray.",
        "attributes": {"dairy_type": "milk_powder", "fat": "full_cream", "unit_weight": 400, "container": "tin"},
        "variants": [v("MZW-400-12", "tray", 12, 1, "7080.00", None)],
    },
}

# --- further products -------------------------------------------------------------------------------

KATI_DELIVERY = (
    "<li>From Kati Highlands' Nyeri warehouse: Nyeri, Karatina and Othaya daily; Nanyuki, Embu and Meru on "
    "Mondays and Thursdays.</li><li>Nairobi deliveries on Wednesdays for orders of 20 cartons or more.</li>"
)
DELIVERY = {"mwangaza": MWANGAZA_DELIVERY, "rift": RIFT_DELIVERY, "pwani": PWANI_DELIVERY, "kati": KATI_DELIVERY}


def listing(
    lead: str,
    points: list[tuple[str, str]],
    rows: list[tuple[str, str]],
    seller: str,
    storage: str,
    use: str | None = None,
    questions: list[tuple[str, str]] | None = None,
) -> str:
    """A shorter marketplace listing: a lead, selling points, a specification table, use, delivery, questions."""
    parts = [
        f"<p>{lead}</p>",
        "<h3>Why shops stock it</h3><ul>" + "".join(f"<li><strong>{a}.</strong> {b}</li>" for a, b in points) + "</ul>",
        "<h3>Specifications</h3>",
        specs(rows),
    ]
    if use:
        parts.append(f"<h3>Using it</h3><p>{use}</p>")
    parts.append(f"<h3>Delivery and storage</h3><ul>{DELIVERY[seller]}<li>{storage}</li></ul>")
    if questions:
        parts.append(faq(questions))
    return "".join(parts)


DRY = "Store dry and off the floor on pallets, away from damp walls; sell the oldest stock first."
COOL = "Keep out of direct sun in a cool store; cartons stack at most five high."

MORE_PRODUCTS: list[dict[str, Any]] = [
    {
        "seller": "mwangaza",
        "category": "flour-grains",
        "name": "Mavuno Whole Maize Meal 2 kg",
        "slug": "mavuno-whole-maize-meal-2kg",
        "image": "maize",
        "gallery": ["maize_cobs", "warehouse"],
        "brand": "Mavuno",
        "short": "Whole maize meal (posho) with the germ and bran left in, for a hearty, golden ugali.",
        "attributes": {
            "grain": "maize",
            "milling": "whole_meal",
            "unit_size": 2,
            "fortified": True,
            "origin": "kenya",
            "shelf_life_months": 4,
        },
        "variants": [v("MVW-2K-12", "bale", 12, 5, "1620.00", 75)],
        "description": listing(
            "<strong>Mavuno whole maize meal is milled from the whole grain</strong>, so it keeps more fibre and a "
            "deeper flavour than sifted flour. Many customers ask for posho by name for everyday ugali and uji.",
            [
                ("Lower price per kg", "Whole meal costs less to mill than sifted flour, and shoppers notice."),
                ("Fortified", "Vitamins A and B, iron, zinc and folic acid are added, as on Mavuno's sifted flour."),
                ("Bale-ready", "Twelve 2 kg packets shrink-wrapped into one 24 kg bale."),
            ],
            [
                ("Product", "Whole maize meal (posho)"),
                ("Pack", "Bale of 12 × 2 kg, 24 kg net"),
                ("Shelf life", "4 months from milling"),
            ],
            "mwangaza",
            DRY + " Whole meal keeps for less time than sifted flour.",
            use="Cook as you would sifted flour, with a little more water: whole meal absorbs more as it thickens.",
        ),
    },
    {
        "seller": "mwangaza",
        "category": "flour-grains",
        "name": "Mavuno Maize Flour 10 kg",
        "slug": "mavuno-maize-flour-10kg",
        "image": "maize",
        "gallery": ["maize_kernels", "truck"],
        "brand": "Mavuno",
        "short": "Mavuno sifted maize flour in a 10 kg bag, for schools, hotels and families who buy in bulk.",
        "attributes": {
            "grain": "maize",
            "milling": "sifted",
            "unit_size": 10,
            "fortified": True,
            "origin": "kenya",
            "shelf_life_months": 6,
        },
        "variants": [v("MVN-10K-01", "sack", 1, 10, "760.00", 140)],
        "description": listing(
            "<strong>The Mavuno sifted flour your customers know, in a 10 kg bag</strong> for kitchens that cook "
            "ugali in quantity: school feeding programmes, hotels and large households.",
            [
                ("Cheapest per kg", "Bulk bags cost less per kilogram than packets."),
                ("One mill", "The same milling and fortification as the 1 kg and 2 kg packets."),
            ],
            [("Product", "Sifted white maize flour"), ("Pack", "Bag of 10 kg"), ("Minimum order", "10 bags")],
            "mwangaza",
            DRY,
        ),
    },
    {
        "seller": "mwangaza",
        "category": "flour-grains",
        "name": "Mwea Pishori Rice 5 kg",
        "slug": "mwea-pishori-rice-5kg",
        "image": "rice",
        "gallery": ["rice_stalks", "pilau"],
        "brand": "Mwea",
        "short": "Mwea Pishori in 5 kg bags, four to a bale: the aromatic rice families buy for pilau.",
        "attributes": {
            "grain": "rice",
            "milling": "whole_grain",
            "unit_size": 5,
            "fortified": False,
            "origin": "kenya",
            "shelf_life_months": 18,
        },
        "variants": [v("MWP-5K-04", "bale", 4, 3, "4180.00", 44)],
        "description": listing(
            "<strong>Fragrant Pishori from the Mwea irrigation scheme</strong> in a 5 kg bag that sells to "
            "households, cleaned and graded to the same standard as Mwangaza's 25 kg sacks.",
            [
                ("Aroma", "Pishori is prized for its scent while cooking and grains that stay separate."),
                ("Shop-sized", "5 kg bags sell faster than sacks in neighbourhood shops."),
            ],
            [("Variety", "Pishori, long grain"), ("Pack", "Bale of 4 × 5 kg, 20 kg net"), ("Shelf life", "18 months")],
            "mwangaza",
            DRY,
            use="Rinse until the water runs clear, then cook with about one and a half cups of water per cup of rice.",
        ),
    },
    {
        "seller": "pwani",
        "category": "flour-grains",
        "name": "Pwani Basmati Rice 5 kg",
        "slug": "pwani-basmati-rice-5kg",
        "image": "rice",
        "gallery": ["rice_raw", "truck"],
        "brand": "Pwani",
        "short": "Imported long-grain basmati, aged for length and aroma, in 5 kg bags.",
        "attributes": {
            "grain": "rice",
            "milling": "whole_grain",
            "unit_size": 5,
            "fortified": False,
            "origin": "imported",
            "shelf_life_months": 24,
        },
        "variants": [v("PWB-5K-04", "bale", 4, 2, "5320.00", 30)],
        "description": listing(
            "<strong>Long, slender basmati grains that double in length when cooked</strong>, imported through "
            "Mombasa and repacked in 5 kg bags for coastal hotels and shops.",
            [
                ("Biryani and pilau", "Basmati is the rice coastal kitchens choose for biryani."),
                ("Aged grain", "Aged before milling, so it cooks drier and fluffier."),
            ],
            [("Variety", "Basmati, extra long grain"), ("Origin", "Imported"), ("Pack", "Bale of 4 × 5 kg")],
            "pwani",
            DRY,
        ),
    },
    {
        "seller": "rift",
        "category": "flour-grains",
        "name": "Unga Bora Self-Raising Flour 2 kg",
        "slug": "unga-bora-self-raising-flour-2kg",
        "image": "flour",
        "gallery": ["kneading", "dough_rolling"],
        "brand": "Unga Bora",
        "short": "Wheat flour with raising agent already mixed in, for mandazi, scones and cakes.",
        "attributes": {
            "grain": "wheat",
            "milling": "self_raising",
            "unit_size": 2,
            "fortified": True,
            "origin": "kenya",
            "shelf_life_months": 9,
        },
        "variants": [v("UBS-2K-10", "bale", 10, 5, "1840.00", 48)],
        "description": listing(
            "<strong>Unga Bora self-raising flour is ready for baking</strong>: the raising agent is already "
            "mixed in, so mandazi and scones rise evenly without measuring baking powder.",
            [
                ("Consistent rise", "Mixed at the mill for an even rise batch after batch."),
                ("Fortified", "Fortified like all Unga Bora wheat flour."),
            ],
            [("Product", "Self-raising wheat flour"), ("Pack", "Bale of 10 × 2 kg"), ("Shelf life", "9 months")],
            "rift",
            DRY,
        ),
    },
    {
        "seller": "kati",
        "category": "flour-grains",
        "name": "Kati Highlands Maize Flour 2 kg",
        "slug": "kati-highlands-maize-flour-2kg",
        "image": "maize",
        "gallery": ["maize_field", "ugali"],
        "brand": "Kati Highlands",
        "short": "Sifted maize flour milled in Nyeri from Mount Kenya maize, in 2 kg packets.",
        "attributes": {
            "grain": "maize",
            "milling": "sifted",
            "unit_size": 2,
            "fortified": True,
            "origin": "kenya",
            "shelf_life_months": 5,
        },
        "variants": [v("KHM-2K-12", "bale", 12, 3, "1710.00", 90)],
        "description": listing(
            "<strong>A white, finely sifted maize flour from the Mount Kenya region</strong>, milled in Nyeri "
            "and delivered across the central highlands.",
            [
                ("Local maize", "Bought from farmers around Nyeri and Laikipia after the long-rains harvest."),
                ("Smaller minimum", "From three bales, so smaller shops can stock it."),
            ],
            [("Product", "Sifted white maize flour"), ("Pack", "Bale of 12 × 2 kg"), ("Shelf life", "5 months")],
            "kati",
            DRY,
        ),
    },
    {
        "seller": "rift",
        "category": "sugar",
        "name": "Sukari Bora White Sugar 2 kg",
        "slug": "sukari-bora-sugar-2kg",
        "image": "sugar",
        "gallery": ["sugar_cubes", "chai"],
        "brand": "Sukari Bora",
        "short": "Fine white sugar in 2 kg packets, twelve to a bale.",
        "attributes": {"sugar_type": "white", "crystal": "fine", "unit_size": 2, "origin": "kenya"},
        "variants": [v("SKB-2K-12", "bale", 12, 2, "3990.00", 54)],
        "description": listing(
            "<strong>Sukari Bora's fine white sugar in the 2 kg packet</strong> that families buy for the week.",
            [
                ("Dissolves fast", "Fine crystals melt quickly in hot tea."),
                ("Clean packing", "Heat-sealed packets in clear bale film."),
            ],
            [("Sugar", "White, fine"), ("Pack", "Bale of 12 × 2 kg, 24 kg net")],
            "rift",
            DRY,
        ),
    },
    {
        "seller": "rift",
        "category": "sugar",
        "name": "Sukari Bora White Sugar 50 kg",
        "slug": "sukari-bora-sugar-50kg",
        "image": "sugar",
        "gallery": ["sugarcane", "warehouse"],
        "brand": "Sukari Bora",
        "short": "White sugar by the 50 kg sack for bakeries, hotels and repacking.",
        "attributes": {"sugar_type": "white", "crystal": "regular", "unit_size": 50, "origin": "kenya"},
        "variants": [v("SKB-50K-01", "sack", 1, 2, "7350.00", 22)],
        "description": listing(
            "<strong>Regular white sugar in a 50 kg woven sack</strong>, the cheapest way to buy sugar per kilogram.",
            [
                ("Bulk price", "About a fifth cheaper per kg than 1 kg packets."),
                ("Lined sacks", "Polythene-lined to keep out damp."),
            ],
            [("Sugar", "White, regular crystal"), ("Pack", "Sack of 50 kg")],
            "rift",
            DRY + " Reseal opened sacks.",
        ),
    },
    {
        "seller": "mwangaza",
        "category": "sugar",
        "name": "Magharibi Brown Sugar 1 kg",
        "slug": "magharibi-brown-sugar-1kg",
        "image": "sugar",
        "gallery": ["tea_glass"],
        "brand": "Magharibi",
        "short": "Golden brown sugar in 1 kg packets for daily shoppers.",
        "attributes": {"sugar_type": "brown", "crystal": "regular", "unit_size": 1, "origin": "kenya"},
        "variants": [v("MGB-1K-24", "bale", 24, 2, "3720.00", 31)],
        "description": listing(
            "<strong>Magharibi brown sugar in 1 kg packets</strong>, for customers who buy a little at a time.",
            [("Rich colour", "Golden crystals with a light molasses taste.")],
            [("Sugar", "Brown"), ("Pack", "Bale of 24 × 1 kg")],
            "mwangaza",
            DRY,
        ),
    },
    {
        "seller": "pwani",
        "category": "sugar",
        "name": "Pwani Refined Sugar 2 kg",
        "slug": "pwani-refined-sugar-2kg",
        "image": "sugar",
        "gallery": ["sugar_spoon", "truck"],
        "brand": "Pwani",
        "short": "Imported refined white sugar, repacked in Mombasa in 2 kg packets.",
        "attributes": {"sugar_type": "white", "crystal": "fine", "unit_size": 2, "origin": "imported"},
        "variants": [v("PWS-2K-10", "bale", 10, 2, "3380.00", 18)],
        "description": listing(
            "<strong>Refined white sugar imported through Mombasa</strong> and packed in 2 kg packets for the coast.",
            [("Coastal supply", "Shipped from Pwani's Shimanzi warehouse twice a week.")],
            [("Sugar", "White, refined"), ("Origin", "Imported"), ("Pack", "Bale of 10 × 2 kg")],
            "pwani",
            DRY,
        ),
    },
    {
        "seller": "pwani",
        "category": "cooking-oils",
        "name": "Jua Gold Cooking Oil 20 L",
        "slug": "jua-gold-cooking-oil-20l",
        "image": "oil",
        "gallery": ["chips_fryer", "oil_pour"],
        "brand": "Jua Gold",
        "short": "Jua Gold vegetable oil in a 20 L jerrycan for hotels, chips vendors and decanting.",
        "attributes": {
            "oil_type": "vegetable",
            "unit_volume": 20,
            "container": "jerrycan",
            "fortified": True,
            "cholesterol_free": True,
        },
        "variants": [v("JUA-20L-01", "jerrycan", 1, 2, "5480.00", 26)],
        "description": listing(
            "<strong>The fortified Jua Gold blend in a 20 L jerrycan</strong>, the size busy kitchens and chips "
            "vendors go through in a week.",
            [
                ("Lowest per litre", "Cheaper per litre than bottles."),
                ("Fry stable", "A blend that holds up to repeated frying."),
            ],
            [("Oil", "Vegetable blend, fortified with vitamins A and D"), ("Pack", "Jerrycan of 20 L")],
            "pwani",
            COOL,
        ),
    },
    {
        "seller": "kati",
        "category": "cooking-oils",
        "name": "Alizeti Sunflower Oil 2 L",
        "slug": "alizeti-sunflower-oil-2l",
        "image": "oil",
        "gallery": ["oil_pour", "frying_pan"],
        "brand": "Alizeti",
        "short": "Light, pressed sunflower oil in 2 L bottles, six to a carton.",
        "attributes": {
            "oil_type": "sunflower",
            "unit_volume": 2,
            "container": "bottle",
            "fortified": True,
            "cholesterol_free": True,
        },
        "variants": [v("ALZ-2L-06", "carton", 6, 2, "3960.00", 40)],
        "description": listing(
            "<strong>Alizeti is a pure sunflower oil</strong>, light in colour and taste, pressed from seed grown in "
            "Kenya and Tanzania.",
            [
                ("Pure sunflower", "Not a blend: customers who ask for sunflower get sunflower."),
                ("Fortified", "Vitamins A and D added."),
            ],
            [("Oil", "Sunflower"), ("Pack", "Carton of 6 × 2 L")],
            "kati",
            COOL,
        ),
    },
    {
        "seller": "kati",
        "category": "cooking-oils",
        "name": "Alizeti Sunflower Oil 5 L",
        "slug": "alizeti-sunflower-oil-5l",
        "image": "oil",
        "gallery": ["oil_pour"],
        "brand": "Alizeti",
        "short": "Alizeti sunflower oil in 5 L jerrycans, four to a carton.",
        "attributes": {
            "oil_type": "sunflower",
            "unit_volume": 5,
            "container": "jerrycan",
            "fortified": True,
            "cholesterol_free": True,
        },
        "variants": [v("ALZ-5L-04", "carton", 4, 1, "6280.00", 15)],
        "description": listing(
            "<strong>Alizeti sunflower oil in the 5 L size</strong> families buy for the month.",
            [("Monthly size", "Fewer trips for customers who cook every day.")],
            [("Oil", "Sunflower"), ("Pack", "Carton of 4 × 5 L")],
            "kati",
            COOL,
        ),
    },
    {
        "seller": "pwani",
        "category": "cooking-oils",
        "name": "Pwani Palm Olein 10 L",
        "slug": "pwani-palm-olein-10l",
        "image": "oil",
        "gallery": ["chips_fryer", "fish_frying"],
        "brand": "Pwani",
        "short": "Refined palm olein for deep frying, in 10 L jerrycans.",
        "attributes": {
            "oil_type": "palm_olein",
            "unit_volume": 10,
            "container": "jerrycan",
            "fortified": True,
            "cholesterol_free": False,
        },
        "variants": [v("PWP-10L-01", "jerrycan", 1, 3, "2640.00", None)],
        "description": listing(
            "<strong>Refined palm olein for deep frying</strong>, the oil fish fryers and mandazi makers on the coast use most.",
            [
                ("High smoke point", "Stands up to long frying at high heat."),
                ("Value", "One of the cheapest oils per litre."),
            ],
            [("Oil", "Palm olein, refined"), ("Pack", "Jerrycan of 10 L")],
            "pwani",
            COOL,
        ),
    },
    {
        "seller": "pwani",
        "category": "cooking-oils",
        "name": "Jua Gold Cooking Oil 5 L",
        "slug": "jua-gold-cooking-oil-5l",
        "status": "archived",  # no longer sold: an older order line points here (reorder shows it as discontinued)
        "image": "oil",
        "gallery": [],
        "brand": "Jua Gold",
        "short": "Jua Gold vegetable oil in 5 L jerrycans (discontinued).",
        "attributes": {
            "oil_type": "vegetable",
            "unit_volume": 5,
            "container": "jerrycan",
            "fortified": True,
            "cholesterol_free": True,
        },
        "variants": [v("JUA-5L-04", "carton", 4, 1, "6900.00", 0)],
        "description": "<p>This pack size is no longer made. Choose the 3 L bottles or the 20 L jerrycan instead.</p>",
    },
    {
        "seller": "pwani",
        "category": "tea-beverages",
        "name": "Mlima Tea Bags, 100 bags",
        "slug": "mlima-tea-bags-100",
        "image": "tea",
        "gallery": ["tea_rows", "chai"],
        "brand": "Mlima",
        "short": "Kericho black tea in a box of 100 string-free bags, 24 boxes to a carton.",
        "attributes": {"beverage": "black_tea", "form": "bags", "unit_weight": 200, "region": "kericho"},
        "variants": [v("MLB-100-24", "carton", 24, 1, "5040.00", 20)],
        "description": listing(
            "<strong>Mlima's Kericho blend in tea bags</strong>, for offices, hotels and customers who brew one cup at a time.",
            [("One cup, one bag", "2 g bags that brew a strong cup in three minutes.")],
            [("Tea", "Black, CTC"), ("Box", "100 bags × 2 g"), ("Pack", "Carton of 24 boxes")],
            "pwani",
            COOL,
        ),
    },
    {
        "seller": "kati",
        "category": "tea-beverages",
        "name": "Kilele Loose Tea 250 g",
        "slug": "kilele-loose-tea-250g",
        "image": "tea",
        "gallery": ["tea_harvest", "tea_glass"],
        "brand": "Kilele",
        "short": "Nyeri highland black tea, loose, in 250 g packets by the carton or the pack of ten.",
        "attributes": {"beverage": "black_tea", "form": "loose", "unit_weight": 250, "region": "nyeri"},
        "variants": [v("KLL-250-40", "carton", 40, 1, "6800.00", 12), v("KLL-250-10", "pack", 10, 2, "1780.00", 30)],
        "description": listing(
            "<strong>Kilele is grown on the slopes above Nyeri</strong>, where cool nights give the leaf a bright, "
            "brisk cup.",
            [
                ("Two ways to buy", "A carton of 40 for shops, or a pack of 10 for kiosks."),
                ("Highland grown", "Picked above 1,800 metres."),
            ],
            [("Tea", "Black, CTC, loose"), ("Packet", "250 g")],
            "kati",
            COOL,
        ),
    },
    {
        "seller": "kati",
        "category": "tea-beverages",
        "name": "Kilele Tea Dust 1 kg",
        "slug": "kilele-tea-dust-1kg",
        "image": "tea",
        "gallery": ["tea_hills", "chai"],
        "brand": "Kilele",
        "short": "Fast-brewing tea dust for hotels and chai kiosks, in 1 kg packets.",
        "attributes": {"beverage": "black_tea", "form": "dust", "unit_weight": 1000, "region": "nyeri"},
        "variants": [v("KLD-1K-12", "carton", 12, 1, "5880.00", 9)],
        "description": listing(
            "<strong>Tea dust brews dark and strong in seconds</strong>, which is why chai kiosks and hotel kitchens "
            "use it by the kilogram.",
            [("Strong and quick", "Fine particles release colour and flavour fast.")],
            [("Tea", "Black, dust grade"), ("Packet", "1 kg"), ("Pack", "Carton of 12")],
            "kati",
            COOL,
        ),
    },
    {
        "seller": "kati",
        "category": "tea-beverages",
        "name": "Kilele Green Tea 100 g",
        "slug": "kilele-green-tea-100g",
        "image": "tea",
        "gallery": ["tea_rows"],
        "brand": "Kilele",
        "short": "Kenyan green tea, loose leaf, in 100 g packets.",
        "attributes": {"beverage": "green_tea", "form": "loose", "unit_weight": 100, "region": "nyeri"},
        "variants": [v("KLG-100-24", "carton", 24, 1, "6120.00", None)],
        "description": listing(
            "<strong>Green tea from Kilele's Nyeri gardens</strong>, steamed and rolled rather than fermented, for a "
            "light, grassy cup.",
            [("Growing demand", "Supermarkets and pharmacies report steady green tea sales.")],
            [("Tea", "Green, loose leaf"), ("Packet", "100 g"), ("Pack", "Carton of 24")],
            "kati",
            COOL,
        ),
    },
    {
        "seller": "pwani",
        "category": "household",
        "name": "Safi Laundry Bar 1 kg",
        "slug": "safi-laundry-bar-1kg",
        "image": "soap",
        "gallery": ["washing", "line_dry"],
        "brand": "Safi",
        "short": "The larger Safi bar, 1 kg, in green or blue, twenty to a carton.",
        "attributes": {"product_type": "laundry_bar", "unit_weight": 1000, "scent": "fresh"},
        "variants": [
            v("SFI-1K-20G", "carton", 20, 1, "4600.00", 22, colour="green"),
            v("SFI-1K-20B", "carton", 20, 1, "4600.00", 0, colour="blue"),
        ],
        "description": listing(
            "<strong>Safi in the 1 kg bar</strong>, for families who wash by hand every day.",
            [
                ("Lasts longer", "A dense bar that does not go soft in the basin."),
                ("Two colours", "Green or blue, same formula."),
            ],
            [("Type", "Laundry bar"), ("Bar", "1 kg"), ("Pack", "Carton of 20")],
            "pwani",
            "Keep cartons dry and off the floor.",
        ),
    },
    {
        "seller": "kati",
        "category": "household",
        "name": "Ngao Multipurpose Bar 600 g",
        "slug": "ngao-multipurpose-bar-600g",
        "image": "soap",
        "gallery": ["laundry_bucket", "soap_bars"],
        "brand": "Ngao",
        "short": "A lemon-scented bar for laundry, dishes and floors, 24 to a carton.",
        "attributes": {"product_type": "multipurpose", "unit_weight": 600, "scent": "lemon"},
        "variants": [v("NGO-600-24", "carton", 24, 1, "3360.00", 35, colour="tan")],
        "description": listing(
            "<strong>One bar for the whole house</strong>: Ngao cleans clothes, dishes and floors, with a fresh lemon scent.",
            [("Versatile", "Shoppers with small budgets buy one bar for every job.")],
            [("Type", "Multipurpose bar"), ("Bar", "600 g"), ("Pack", "Carton of 24")],
            "kati",
            "Keep cartons dry and off the floor.",
        ),
    },
    {
        "seller": "kati",
        "category": "household",
        "name": "Ngao Herbal Bath Soap 175 g",
        "slug": "ngao-herbal-bath-soap-175g",
        "image": "soap",
        "gallery": ["soap_bars"],
        "brand": "Ngao",
        "short": "A gentle herbal bath soap, 48 bars to a carton.",
        "attributes": {"product_type": "bath_soap", "unit_weight": 175, "scent": "herbal"},
        "variants": [v("NGB-175-48", "carton", 48, 1, "3120.00", 28, colour="white")],
        "description": listing(
            "<strong>A mild bath soap with herbal oils</strong>, priced for everyday family use.",
            [("Family size", "A 175 g bar that lasts.")],
            [("Type", "Bath soap"), ("Bar", "175 g"), ("Pack", "Carton of 48")],
            "kati",
            "Keep cartons dry and off the floor.",
        ),
    },
    {
        "seller": "kati",
        "category": "dairy",
        "name": "Kati Full Cream Milk Powder 500 g",
        "slug": "kati-full-cream-milk-powder-500g",
        "image": "milk",
        "gallery": ["milk_pour", "powder_scoop"],
        "brand": "Kati Dairy",
        "short": "Full-cream milk powder from Nyeri dairies, in 500 g sachets.",
        "attributes": {"dairy_type": "milk_powder", "fat": "full_cream", "unit_weight": 500, "container": "sachet"},
        "variants": [v("KDM-500-24", "carton", 24, 1, "9360.00", 14)],
        "description": listing(
            "<strong>Milk powder made from Nyeri cooperative milk</strong>, spray-dried and packed in 500 g sachets.",
            [("Full cream", "Made from whole milk, not fat-filled."), ("Keeps", "Twelve months unopened.")],
            [("Product", "Full-cream milk powder"), ("Sachet", "500 g"), ("Pack", "Carton of 24")],
            "kati",
            COOL,
        ),
    },
    {
        "seller": "kati",
        "category": "dairy",
        "name": "Kati Tea Whitener 400 g",
        "slug": "kati-tea-whitener-400g",
        "image": "milk",
        "gallery": ["chai", "milk_glass"],
        "brand": "Kati Dairy",
        "short": "A fat-filled tea whitener for chai, in 400 g sachets.",
        "attributes": {"dairy_type": "tea_whitener", "fat": "fat_filled", "unit_weight": 400, "container": "sachet"},
        "variants": [v("KDW-400-24", "carton", 24, 1, "5760.00", 26)],
        "description": listing(
            "<strong>A creamy whitener for tea</strong>, cheaper than milk powder and made for chai.",
            [("Labelled clearly", "Fat-filled, as the label says.")],
            [("Product", "Tea whitener, fat-filled"), ("Sachet", "400 g"), ("Pack", "Carton of 24")],
            "kati",
            COOL,
        ),
    },
    {
        "seller": "lakeside",
        "category": "dairy",
        "name": "Maziwa Milk Powder 900 g",
        "slug": "maziwa-milk-powder-900g",
        "image": "milk",
        "gallery": ["milk_pour"],
        "brand": "Maziwa",
        "short": "Full-cream milk powder in 900 g tins.",
        "attributes": {"dairy_type": "milk_powder", "fat": "full_cream", "unit_weight": 900, "container": "tin"},
        "variants": [v("MZW-900-12", "tray", 12, 1, "12960.00", None)],
        "description": "<p>Full-cream milk powder in 900 g tins, twelve to a tray. Lakeside will publish this once approved.</p>",
    },
]

# --- a cart and order history for Wanjiru General Stores --------------------------------------------

# (sku, packs, price when added or None for today's price): the first line was added before a price rise.
CART = {
    "email": "brian@wanjiru-demo.co.ke",
    "lines": [("MVN-2K-12", 5, "1690.00"), ("JUA-3L-06", 2, None), ("MLM-500-05", 2, None)],
}

# Historical orders (immutable): one line repriced since, one out of stock, one discontinued, one MOQ raised.
ORDERS: list[dict[str, Any]] = [
    {
        "number": "SO-2026-0141",
        "seller": "mwangaza",
        "email": "grace@wanjiru-demo.co.ke",
        "days_ago": 21,
        "status": "delivered",
        "notes": "Deliver before 10:00 and use the back gate.",
        "lines": [("MVN-2K-12", 10, "1690.00"), ("MWP-25K-01", 2, "4850.00"), ("MGB-2K-10", 3, "3150.00")],
    },
    {
        "number": "SO-2026-0158",
        "seller": "pwani",
        "email": "brian@wanjiru-demo.co.ke",
        "days_ago": 9,
        "status": "delivered",
        "notes": "",
        "lines": [("JUA-3L-06", 2, "5100.00"), ("SFI-800-25", 2, "4375.00"), ("JUA-5L-04", 1, "6900.00")],
    },
    {
        "number": "SO-2026-0163",
        "seller": "rift",
        "email": "grace@wanjiru-demo.co.ke",
        "days_ago": 2,
        "status": "shipped",
        "notes": "Call Grace on arrival.",
        "lines": [("SKB-1K-24", 2, "3960.00"), ("UBF-2K-10", 4, "1650.00")],
    },
]
