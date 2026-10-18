"""Keep search documents current: whatever changes what a buyer would find rebuilds the affected documents."""

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.catalog.models import Product, Variant
from apps.catalog.search import index, index_many
from apps.organizations.models import Address, Organization
from apps.sellers.models import SellerProfile


@receiver(post_save, sender=Product)
def product_saved(sender, instance: Product, raw: bool = False, **kwargs) -> None:
    if not raw:
        index(instance)


@receiver(post_save, sender=Variant)
def variant_saved(sender, instance: Variant, raw: bool = False, **kwargs) -> None:
    if not raw:
        index(instance.product)


@receiver(post_delete, sender=Variant)
def variant_deleted(sender, instance: Variant, origin=None, **kwargs) -> None:
    # Only a variant deleted on its own: when its product is being deleted the document goes with it.
    if isinstance(origin, Variant):
        index(Product.objects.get(pk=instance.product_id))  # pyright: ignore[reportAttributeAccessIssue]


@receiver(post_save, sender=SellerProfile)
@receiver(post_save, sender=Organization)
@receiver(post_save, sender=Address)
def seller_changed(sender, instance, raw: bool = False, **kwargs) -> None:
    if raw:
        return
    org_id = instance.pk if sender is Organization else instance.organization_id
    index_many(Product.objects.filter(seller_id=org_id))
