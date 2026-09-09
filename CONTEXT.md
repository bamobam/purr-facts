# Purr Facts

A public portfolio project: a query engine and web app over a cat-food/treats product catalog, supporting filtering, grouping, and aggregation queries (with join and "division" queries as a possible later extension).

## Language

**Product**:
A single purchasable SKU — one specific brand, flavor/variant, and format (e.g. "Fancy Feast Gravy Lovers Chicken, 3oz can"). The core entity everything else (brand, nutrition, price) attaches to. There is no separate parent/child split between a "base product" and its flavors — each flavor or format is its own Product row.
_Avoid_: Item, SKU, Variant (as an entity)

**Brand**:
The manufacturer/label name a Product belongs to (as recorded by the source data, e.g. "Purina," "Royal Canin"), used for grouping and aggregation.
_Avoid_: Manufacturer, Company

**Variant**:
An attribute of a Product describing what distinguishes it from its brand's other Products — flavor, texture, or format (e.g. "Chicken," "Gravy," "Pâté"). Not a separate entity; a field on Product.
_Avoid_: Flavor (too narrow — also covers texture/format, not just taste)

**Food Type**:
Which of the three catalog categories a Product belongs to: `dry`, `wet`, or `treat`. Treats are full members of the catalog, not a separate concept.
_Avoid_: Category (too generic elsewhere in the domain)
