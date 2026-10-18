"""The demo marketplace: organizations, people, documents, categories and products (demo data only).

People and businesses are invented; places are real Kenyan towns. Every login shares DEMO_PASSWORD,
which the sign-in page shows only where settings.AC_DEMO_ACCOUNTS is on (never in production).
"""

DEMO_PASSWORD = "Soko-Demo-2026!"

ORGANIZATIONS = [
    {
        "key": "soko",
        "name": "SokoMesh Marketplace",
        "type": "marketplace_admin",
        "approval": "approved",
        "legal": "SokoMesh Demo Ltd",
    },
    {
        "key": "mwangaza",
        "name": "Mwangaza Wholesalers Ltd",
        "type": "seller",
        "approval": "approved",
        "legal": "Mwangaza Wholesalers Limited",
        "pin": "P051234567X",
        "seller": "active",
    },
    {
        "key": "rift",
        "name": "Rift Valley Traders",
        "type": "seller",
        "approval": "approved",
        "legal": "Rift Valley Traders Limited",
        "pin": "P051998877K",
        "seller": "active",
    },
    {
        "key": "pwani",
        "name": "Pwani Distributors",
        "type": "seller",
        "approval": "approved",
        "legal": "Pwani Distributors Limited",
        "pin": "P052113344M",
        "seller": "active",
    },
    {
        "key": "kati",
        "name": "Kati Highlands Supply Ltd",
        "type": "seller",
        "approval": "approved",
        "legal": "Kati Highlands Supply Limited",
        "pin": "P052778899R",
        "seller": "active",
    },
    {
        "key": "lakeside",
        "name": "Lakeside Supplies",
        "type": "seller",
        "approval": "pending",
        "legal": "Lakeside Supplies Limited",
        "pin": "P052556677Q",
        "seller": "under_review",
    },
    {
        "key": "wanjiru",
        "name": "Wanjiru General Stores",
        "type": "buyer",
        "approval": "approved",
        "legal": "Wanjiru General Stores",
        "pin": "A009876543Z",
    },
    {
        "key": "baraka",
        "name": "Baraka Mini-Mart",
        "type": "buyer",
        "approval": "pending",
        "legal": "Baraka Mini-Mart Enterprises",
    },
    # Buyers without demo logins: they have traded with Mwangaza for months, so the seller's analytics,
    # trading partners and price groups have a history to show (SM-F-06, SM-F-19).
    {
        "key": "kilimo",
        "name": "Kilimo Fresh Grocers",
        "type": "buyer",
        "approval": "approved",
        "legal": "Kilimo Fresh Grocers Limited",
        "pin": "P052334411T",
    },
    {
        "key": "njeri",
        "name": "Mama Njeri Kiosk Supplies",
        "type": "buyer",
        "approval": "approved",
        "legal": "Mama Njeri Kiosk Supplies",
        "pin": "A009112233B",
    },
]

# Shown on the sign-in page in this order. `avatar` names the prepared portrait in apps/demo/avatars.
ACCOUNTS = [
    {
        "email": "amina@sokomesh-demo.co.ke",
        "name": "Amina Hassan",
        "org": "soko",
        "role": "marketplace_admin",
        "phone": "+254 711 204 518",
        "avatar": "amina",
        "summary": "Reviews sellers and approves buyers",
    },
    {
        "email": "faith@mwangaza-demo.co.ke",
        "name": "Faith Chebet",
        "org": "mwangaza",
        "role": "seller_manager",
        "phone": "+254 722 418 330",
        "avatar": "faith",
        "summary": "Runs an approved seller in Nakuru",
    },
    {
        "email": "peter@mwangaza-demo.co.ke",
        "name": "Peter Kamau",
        "org": "mwangaza",
        "role": "warehouse_operator",
        "phone": "+254 733 902 114",
        "avatar": "peter",
        "summary": "Works the Mwangaza warehouse",
    },
    {
        "email": "joseph@lakeside-demo.co.ke",
        "name": "Joseph Mutua",
        "org": "lakeside",
        "role": "seller_manager",
        "phone": "+254 745 310 662",
        "avatar": "joseph",
        "summary": "Seller application under review",
    },
    {
        "email": "grace@wanjiru-demo.co.ke",
        "name": "Grace Wanjiru",
        "org": "wanjiru",
        "role": "buyer_owner",
        "phone": "+254 712 345 678",
        "avatar": "grace",
        "summary": "Owns a shop in Naivasha",
    },
    {
        "email": "brian@wanjiru-demo.co.ke",
        "name": "Brian Otieno",
        "org": "wanjiru",
        "role": "buyer_purchaser",
        "phone": "+254 790 556 201",
        "avatar": "brian",
        "summary": "Buys stock for Wanjiru General Stores",
    },
]

ADDRESSES = {
    "kilimo": [
        {
            "label": "Shop",
            "line1": "Kenyatta Avenue, next to the post office",
            "city": "Nakuru",
            "region": "Nakuru",
            "postal_code": "20100",
        }
    ],
    "njeri": [
        {
            "label": "Kiosk",
            "line1": "Market Road, stall 12",
            "city": "Gilgil",
            "region": "Nakuru",
            "postal_code": "20116",
        }
    ],
    "mwangaza": [
        {
            "label": "Warehouse",
            "line1": "Plot 14, Industrial Area, off Lanet Road",
            "city": "Nakuru",
            "region": "Nakuru",
            "postal_code": "20100",
            "location_point": {"lat": -0.2827, "lng": 36.0880},
        },
        {
            "label": "Head office",
            "line1": "Kenyatta Avenue, Gatehouse Building, 2nd floor",
            "city": "Nakuru",
            "region": "Nakuru",
            "postal_code": "20100",
        },
    ],
    "wanjiru": [
        {
            "label": "Shop",
            "line1": "Moi Avenue, opposite the bus stage",
            "city": "Naivasha",
            "region": "Nakuru",
            "postal_code": "20117",
            "location_point": {"lat": -0.7167, "lng": 36.4333},
        },
        {
            "label": "Store room",
            "line1": "Kabati, off Moi South Lake Road",
            "city": "Naivasha",
            "region": "Nakuru",
            "postal_code": "20117",
        },
    ],
    "lakeside": [
        {
            "label": "Depot",
            "line1": "Obote Road, Kisumu Industrial Area",
            "city": "Kisumu",
            "region": "Kisumu",
            "postal_code": "40100",
        }
    ],
    "rift": [
        {
            "label": "Warehouse",
            "line1": "Uganda Road, Langas",
            "city": "Eldoret",
            "region": "Uasin Gishu",
            "postal_code": "30100",
        }
    ],
    "kati": [
        {
            "label": "Warehouse",
            "line1": "Kimathi Way, Nyeri Industrial Area",
            "city": "Nyeri",
            "region": "Nyeri",
            "postal_code": "10100",
        }
    ],
    "pwani": [
        {
            "label": "Warehouse",
            "line1": "Changamwe Road, Shimanzi",
            "city": "Mombasa",
            "region": "Mombasa",
            "postal_code": "80100",
        }
    ],
}

# SellerProfile.description is rich text (spec SM-F-02): headings, emphasis and lists, sanitised on save.
SELLERS = {
    "mwangaza": {
        "public_name": "Mwangaza Wholesalers",
        "support_email": "orders@mwangaza-demo.co.ke",
        "support_phone": "+254 722 418 330",
        "description": (
            "<p><strong>Flour, rice and sugar for shops across the Rift Valley</strong>, from our warehouse on Lanet Road.</p>"
            "<h3>How we deliver</h3><ul><li>Nakuru, Naivasha and Gilgil: next working day</li>"
            "<li>Eldoret and Kericho: Tuesdays and Fridays</li><li>Orders confirmed before 14:00 leave the same day</li></ul>"
            "<h3>Buying from us</h3><p>Minimum orders are per product. Bales are shrink-wrapped and stacked six high on pallets; "
            "short deliveries are credited on the next invoice.</p>"
        ),
    },
    "rift": {
        "public_name": "Rift Valley Traders",
        "support_email": "sales@riftvalley-demo.co.ke",
        "support_phone": "+254 720 661 093",
        "description": "<p>Sugar and baking flour for retailers in Uasin Gishu and Nandi, delivered from Eldoret.</p><ul><li>Deliveries Monday to Saturday</li><li>Quantity prices from 10 bales</li></ul>",
    },
    "pwani": {
        "public_name": "Pwani Distributors",
        "support_email": "hello@pwani-demo.co.ke",
        "support_phone": "+254 741 220 874",
        "description": "<p>Cooking oil and household goods from Mombasa to the whole coast.</p><h3>Coverage</h3><ul><li>Mombasa, Kilifi and Kwale: twice a week</li><li>Malindi and Lamu: on request</li></ul>",
    },
    "kati": {
        "public_name": "Kati Highlands Supply",
        "support_email": "orders@kati-demo.co.ke",
        "support_phone": "+254 723 559 410",
        "description": (
            "<p><strong>Tea, dairy, oil and household goods from the slopes of Mount Kenya</strong>, packed and "
            "dispatched from Nyeri.</p><h3>Coverage</h3><ul><li>Nyeri, Karatina and Othaya: daily</li>"
            "<li>Nanyuki, Embu and Meru: Mondays and Thursdays</li><li>Nairobi: Wednesdays, from 20 cartons</li></ul>"
        ),
    },
    "lakeside": {
        "public_name": "Lakeside Supplies",
        "support_email": "joseph@lakeside-demo.co.ke",
        "support_phone": "+254 745 310 662",
        "description": "<p>Tea and dairy for Kisumu and the lake region.</p><p>We are new to SokoMesh and will deliver from our Obote Road depot.</p>",
    },
}

DOCUMENTS = {
    "mwangaza": [
        ("registration", "verified", None, ""),
        ("tax", "verified", None, ""),
        ("license", "verified", "2026-12-31", "County trading licence, Nakuru"),
    ],
    "rift": [("registration", "verified", None, ""), ("tax", "verified", None, "")],
    "pwani": [("registration", "verified", None, ""), ("tax", "verified", None, "")],
    "kati": [("registration", "verified", None, ""), ("tax", "verified", None, "")],
    "lakeside": [
        ("registration", "pending", None, ""),
        ("tax", "pending", None, ""),
        ("bank_verification", "pending", "2026-11-30", ""),
    ],
}

CATEGORIES = [
    ("flour-grains", "Flour & grains", "Maize flour, wheat flour and rice from approved Kenyan wholesalers."),
    ("sugar", "Sugar & sweeteners", "Brown and white sugar by the bale and the sack."),
    ("cooking-oils", "Cooking oils", "Vegetable and sunflower oils in cartons."),
    ("tea-beverages", "Tea & beverages", "Loose tea and drinks for shops and kiosks."),
    ("household", "Household & cleaning", "Soap, detergents and cleaning supplies."),
    ("dairy", "Dairy", "Milk powder and long-life dairy."),
]

_IMG = {
    "maize": ("/images/products/maize-flour.webp", "A heap of yellow maize flour (demo photograph)", 900, 763),
    "sugar": ("/images/products/sugar.webp", "A bowl of white granulated sugar (demo photograph)", 840, 900),
    "oil": ("/images/products/cooking-oil.webp", "A clear bottle of golden cooking oil (demo photograph)", 322, 900),
    "tea": ("/images/products/tea.webp", "A heap of loose black tea leaves (demo photograph)", 900, 479),
    "rice": ("/images/products/rice.webp", "A bowl of uncooked long-grain rice (demo photograph)", 848, 900),
    "soap": ("/images/products/soap.webp", "Two bars of hard soap, one green and one tan (demo photograph)", 900, 388),
    "flour": ("/images/products/wheat-flour.webp", "A glass bowl of white wheat flour (demo photograph)", 900, 762),
    "milk": ("/images/products/milk-powder.webp", "A heap of milk powder (demo photograph)", 285, 323),
}


def image(key: str) -> dict:
    url, alt, w, h = _IMG[key]
    return {"url": url, "alt": alt, "width": w, "height": h}


# Products, their galleries and rich-text listings live in apps/demo/products.py.
