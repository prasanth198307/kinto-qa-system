# F19 — E-Commerce Full Customer Journey
# Register → Browse → Wishlist → Cart → Coupon → Razorpay (sandbox) → Order → ERP Sync → Dispatch
# NOTE: Razorpay payment uses sandbox test card. Actual payment may not complete in test env.
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: ERP Setup — List Items on E-Commerce Store
4. [Browser] Navigate to E-Commerce Store management (path: /gold-erp?section=ecommerce)
5. [Verify] Assert E-Commerce Store screen is visible
6. [Browser] Enable store or check that items DT-0042, DT-0055 are listed
7. [Browser] Ensure store is set to Active/Published status
8. [Verify] Assert store shows at least 2 items with live gold rate pricing

## PHASE 2: Browse as Customer (Public Store)
9. [Browser] Navigate to public store URL if available (check for a /store or customer-facing URL)
10. [Verify] Assert product listings show with gold rate-based pricing
11. [Verify] Assert item images, names, weights, and prices are visible

## PHASE 3: Add to Wishlist
12. [Browser] Click the Wishlist or heart icon on the first product
13. [Verify] Assert item added to wishlist (wishlist count badge updates)

## PHASE 4: Add to Cart
14. [Browser] Click "Add to Cart" on a product (e.g. 22K Necklace)
15. [Verify] Assert cart count badge updates to 1
16. [Browser] Navigate to Cart
17. [Verify]
    - Assert cart shows the item with correct price
    - Assert GST breakdown is visible
    - Assert total is calculated correctly

## PHASE 5: Apply Coupon (if applicable)
18. [Browser] Look for a coupon/promo code input field in cart
19. [Browser] Enter "DIWALI10" as coupon code (if promotions module has this configured)
20. [Verify] Assert either a discount is applied OR an error says coupon not found (both are valid outcomes)

## PHASE 6: Checkout (Razorpay Sandbox)
21. [Browser] Click "Proceed to Checkout" or "Buy Now"
22. [Browser] Fill customer details if required: Name "Test Customer", email, phone
23. [Browser] Fill delivery address
24. [Browser] Click "Pay Now" / "Place Order"
25. [Verify] Assert Razorpay payment modal or redirect appears
26. [Browser] If Razorpay sandbox is available, use test card: 4111 1111 1111 1111, CVV 123, any future expiry
27. [Browser] Click Pay in Razorpay modal
28. [Verify] Assert either payment success redirect OR a clear message that Razorpay sandbox is in test mode

## PHASE 7: ERP Order Sync
29. [Browser] Navigate back to ERP (path: /gold-erp?section=oms-orders)
30. [Verify]
    - Assert the e-commerce order appears in OMS Orders
    - Assert order status is "Received" or "New Order from Store"
    - Assert item details match what was ordered

## PHASE 8: Dispatch from ERP
31. [Browser] Open the OMS order and update status to "Processing"
32. [Browser] Generate dispatch notification
33. [Browser] Update to "Dispatched" with courier details
34. [Verify] Assert OMS order shows dispatched status with tracking info
