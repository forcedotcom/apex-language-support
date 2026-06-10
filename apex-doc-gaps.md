# Apex Public Documentation Gap Report

> Generated 2026-06-09 by comparing the Apex bytecode type registry against stubs scraped from the public [Apex Reference Guide](https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/).

## Summary

| Metric | Count |
|--------|-------|
| Namespaces with gaps | 38 |
| Classes with at least one gap | 235 |
| Total missing method signatures | 1152 |

**Methodology:** The bytecode registry is the ground truth for what methods exist at runtime.
The public docs are scraped weekly to generate stub `.cls` files used by language tooling.
This report lists every method signature present in the bytecode but absent from the scraped stubs.
Inherited boilerplate (`equals`, `hashCode`, `toString`, enum methods, exception accessors) is excluded.

## Gaps by Namespace

- [ApexPages](#apexpages) — 38 missing signatures across 5 classes
- [Approval](#approval) — 9 missing signatures across 3 classes
- [Auth](#auth) — 31 missing signatures across 20 classes
- [Cache](#cache) — 55 missing signatures across 3 classes
- [Canvas](#canvas) — 19 missing signatures across 5 classes
- [ChatterAnswers](#chatteranswers) — 1 missing signature across 1 class
- [CommerceExtension](#commerceextension) — 1 missing signature across 1 class
- [CommercePayments](#commercepayments) — 25 missing signatures across 14 classes
- [CommerceTax](#commercetax) — 10 missing signatures across 10 classes
- [ConnectApi](#connectapi) — 572 missing signatures across 56 classes
- [DataSource](#datasource) — 19 missing signatures across 6 classes
- [DataWeave](#dataweave) — 2 missing signatures across 1 class
- [Database](#database) — 17 missing signatures across 4 classes
- [Datacloud](#datacloud) — 1 missing signature across 1 class
- [EventBus](#eventbus) — 28 missing signatures across 5 classes
- [Flow](#flow) — 1 missing signature across 1 class
- [Functions](#functions) — 7 missing signatures across 4 classes
- [Invocable](#invocable) — 3 missing signatures across 1 class
- [LxScheduler](#lxscheduler) — 1 missing signature across 1 class
- [Messaging](#messaging) — 68 missing signatures across 7 classes
- [Metadata](#metadata) — 2 missing signatures across 2 classes
- [Pref_center](#pref-center) — 3 missing signatures across 2 classes
- [Process](#process) — 2 missing signatures across 1 class
- [QuickAction](#quickaction) — 12 missing signatures across 6 classes
- [Reports](#reports) — 11 missing signatures across 7 classes
- [RichMessaging](#richmessaging) — 3 missing signatures across 3 classes
- [Schema](#schema) — 20 missing signatures across 5 classes
- [Sfc](#sfc) — 1 missing signature across 1 class
- [Sfdc_Enablement](#sfdc-enablement) — 1 missing signature across 1 class
- [Site](#site) — 2 missing signatures across 1 class
- [Slack](#slack) — 60 missing signatures across 9 classes
- [Support](#support) — 2 missing signatures across 2 classes
- [System](#system) — 114 missing signatures across 39 classes
- [TerritoryMgmt](#territorymgmt) — 1 missing signature across 1 class
- [TxnSecurity](#txnsecurity) — 2 missing signatures across 2 classes
- [VisualEditor](#visualeditor) — 1 missing signature across 1 class
- [Wave](#wave) — 6 missing signatures across 2 classes
- [sfdc_surveys](#sfdc-surveys) — 1 missing signature across 1 class

---

## ApexPages

**38 missing signatures across 5 classes**

### ApexPages.Component

Bytecode has 2 method signatures, docs stub has 1. Missing:

- `ApexPages.Component getComponentById(String)`

### ApexPages.IdeaStandardController

Bytecode has 9 method signatures, docs stub has 2. Missing:

- `void addFields(List&lt;String&gt;)`
- `System.PageReference cancel()`
- `System.PageReference delete()`
- `System.PageReference edit()`
- `String getId()`
- `SObject getRecord()`
- `System.PageReference save()`
- `System.PageReference view()`

### ApexPages.IdeaStandardSetController

Bytecode has 23 method signatures, docs stub has 2. Missing:

- `void addFields(List&lt;String&gt;)`
- `System.PageReference cancel()`
- `void first()`
- `Boolean getCompleteResult()`
- `String getFilterId()`
- `Boolean getHasNext()`
- `Boolean getHasPrevious()`
- `List&lt;System.SelectOption&gt; getListViewOptions()`
- `Integer getPageNumber()`
- `Integer getPageSize()`
- `List&lt;SObject&gt; getRecords()`
- `SObject getRecord()`
- `Integer getResultSize()`
- `List&lt;SObject&gt; getSelected()`
- `void last()`
- `void next()`
- `void previous()`
- `System.PageReference save()`
- `void setFilterId(String)`
- `void setPageNumber(Integer)`
- `void setPageSize(Integer)`
- `void setSelected(List&lt;SObject&gt;)`

### ApexPages.KnowledgeArticleVersionStandardController

Bytecode has 7 method signatures, docs stub has 3. Missing:

- `void addFields(List&lt;String&gt;)`
- `System.PageReference cancel()`
- `String getId()`
- `SObject getRecord()`
- `void selectDataCategory(String, String)`
- `System.PageReference view()`

### ApexPages.StandardSetController

Bytecode has 22 method signatures, docs stub has 22. Missing:

- `void addFields(List&lt;String&gt;)`

---

## Approval

**9 missing signatures across 3 classes**

### Approval.ProcessResult

Bytecode has 7 method signatures, docs stub has 7. Missing:

- `List&lt;Id&gt; getActorIds()`

### Approval.ProcessSubmitRequest

Bytecode has 12 method signatures, docs stub has 9. Missing:

- `String getComments()`
- `List&lt;Id&gt; getNextApproverIds()`
- `void setComments(String)`
- `void setNextApproverIds(List&lt;Id&gt;)`

### Approval.ProcessWorkitemRequest

Bytecode has 8 method signatures, docs stub has 5. Missing:

- `String getComments()`
- `List&lt;Id&gt; getNextApproverIds()`
- `void setComments(String)`
- `void setNextApproverIds(List&lt;Id&gt;)`

---

## Auth

**31 missing signatures across 20 classes**

### Auth.AuthConfiguration

Bytecode has 27 method signatures, docs stub has 26. Missing:

- `Boolean getEmbeddedLoginEnabled()`

### Auth.AuthProviderPlugin

Bytecode has 4 method signatures, docs stub has 0. Missing:

- `String getCustomMetadataType()`
- `Auth.UserData getUserInfo(Map&lt;String,String&gt;, Auth.AuthProviderTokenResponse)`
- `Auth.AuthProviderTokenResponse handleCallback(Map&lt;String,String&gt;, Auth.AuthProviderCallbackState)`
- `System.PageReference initiate(Map&lt;String,String&gt;, String)`

### Auth.AuthProviderPluginClass

Bytecode has 2 method signatures, docs stub has 6. Missing:

- `Auth.OAuthRefreshResult refresh(Map&lt;String,String&gt;, String)`

### Auth.AuthToken

Bytecode has 5 method signatures, docs stub has 3. Missing:

- `static Map&lt;String,String&gt; getAccessTokenMap(String, String)`
- `static Map&lt;String,String&gt; refreshAccessToken(String, String, String)`

### Auth.ConfigurableSelfRegHandler

Bytecode has 1 method signature, docs stub has 0. Missing:

- `Id createUser(Id, Id, Map&lt;Schema.SObjectField,String&gt;, String)`

### Auth.ConfirmUserRegistrationHandler

Bytecode has 1 method signature, docs stub has 0. Missing:

- `Id confirmUser(Id, Id, Id, Auth.UserData)`

### Auth.ConnectedAppPlugin

Bytecode has 8 method signatures, docs stub has 8. Missing:

- `Map&lt;String,String&gt; customAttributes(Id, Map&lt;String,String&gt;)`
- `dom.XmlNode modifySAMLResponse(Map&lt;String,String&gt;, Id, dom.XmlNode)`

### Auth.CustomOneTimePasswordDeliveryHandler

Bytecode has 1 method signature, docs stub has 0. Missing:

- `Auth.CustomOneTimePasswordDeliveryResult sendOneTimePassword(Id, String, String, String, Id, String)`

### Auth.ExternalClientAppOauthHandler

Bytecode has 4 method signatures, docs stub has 4. Missing:

- `Map&lt;String,String&gt; customAttributes(Id, Id, Map&lt;String,String&gt;, Auth.InvocationContext)`

### Auth.HeadlessSelfRegistrationHandler

Bytecode has 1 method signature, docs stub has 0. Missing:

- `User createUser(Id, Auth.UserData, String, String, String)`

### Auth.HeadlessUserDiscoveryHandler

Bytecode has 1 method signature, docs stub has 0. Missing:

- `Auth.HeadlessUserDiscoveryResponse discoverUserFromLoginHint(Id, String, Auth.VerificationAction, String, Map&lt;String,String&gt;)`

### Auth.JWT

Bytecode has 14 method signatures, docs stub has 14. Missing:

- `void setAdditionalClaims(Map&lt;String,ANY&gt;)`

### Auth.LoginDiscoveryHandler

Bytecode has 1 method signature, docs stub has 0. Missing:

- `System.PageReference login(String, String, Map&lt;String,String&gt;)`

### Auth.MyDomainLoginDiscoveryHandler

Bytecode has 1 method signature, docs stub has 0. Missing:

- `System.PageReference login(String, String, Map&lt;String,String&gt;)`

### Auth.Oauth2TokenExchangeHandler

Bytecode has 5 method signatures, docs stub has 3. Missing:

- `Contact getContactForTokenSubject(Id, Auth.TokenValidationResult, Boolean, String, Auth.IntegratingAppType)`
- `Boolean mapToUser(Id, Auth.TokenValidationResult, Boolean, Boolean, String, Auth.IntegratingAppType)`

### Auth.RegistrationHandler

Bytecode has 2 method signatures, docs stub has 0. Missing:

- `User createUser(Id, Auth.UserData)`
- `void updateUser(Id, Id, Auth.UserData)`

### Auth.SamlJitHandler

Bytecode has 2 method signatures, docs stub has 0. Missing:

- `User createUser(Id, Id, Id, String, Map&lt;String,String&gt;, String)`
- `void updateUser(Id, Id, Id, Id, String, Map&lt;String,String&gt;, String)`

### Auth.SessionManagement

Bytecode has 18 method signatures, docs stub has 16. Missing:

- `static Map&lt;String,String&gt; getCurrentSession()`
- `static Map&lt;String,String&gt; getQrCode()`

### Auth.TokenValidationResult

Bytecode has 7 method signatures, docs stub has 6. Missing:

- `Boolean isValid()`

### Auth.VerificationException

Bytecode has 4 method signatures, docs stub has 1. Missing:

- `String getActivityDescription()`
- `Auth.VerificationPolicy getPolicy()`
- `String getRetUrl()`

---

## Cache

**55 missing signatures across 3 classes**

### Cache.CacheBuilder

Bytecode has 1 method signature, docs stub has 0. Missing:

- `Object doLoad(String)`

### Cache.OrgPartition

Bytecode has 28 method signatures, docs stub has 1. Missing:

- `Map&lt;String,Boolean&gt; contains(Set&lt;String&gt;)`
- `static String createFullyQualifiedKey(String, String, String)`
- `static String createFullyQualifiedPartition(String, String)`
- `Long getAvgGetSize()`
- `Long getAvgGetTime()`
- `Long getAvgValueSize()`
- `Double getCapacity()`
- `Set&lt;String&gt; getKeys()`
- `Long getMaxGetSize()`
- `Long getMaxGetTime()`
- `Long getMaxValueSize()`
- `Double getMissRate()`
- `String getName()`
- `Long getNumKeys()`
- `Map&lt;String,ANY&gt; get(Set&lt;String&gt;)`
- `Object get(System.Type, String)`
- `Boolean isAvailable()`
- `void put(String, Object)`
- `void put(String, Object, Integer)`
- `void put(String, Object, Integer, cache.Visibility, Boolean)`
- `Boolean remove(String)`
- `Boolean remove(System.Type, String)`
- `static void validateCacheBuilder(System.Type)`
- `static void validateKeys(Boolean, List&lt;String&gt;)`
- `static void validateKeyValue(Boolean, String, Object)`
- `static void validateKey(Boolean, String)`
- `static void validatePartitionName(String)`

### Cache.SessionPartition

Bytecode has 28 method signatures, docs stub has 1. Missing:

- `Map&lt;String,Boolean&gt; contains(Set&lt;String&gt;)`
- `static String createFullyQualifiedKey(String, String, String)`
- `static String createFullyQualifiedPartition(String, String)`
- `Long getAvgGetSize()`
- `Long getAvgGetTime()`
- `Long getAvgValueSize()`
- `Double getCapacity()`
- `Set&lt;String&gt; getKeys()`
- `Long getMaxGetSize()`
- `Long getMaxGetTime()`
- `Long getMaxValueSize()`
- `Double getMissRate()`
- `String getName()`
- `Long getNumKeys()`
- `Map&lt;String,ANY&gt; get(Set&lt;String&gt;)`
- `Object get(System.Type, String)`
- `Boolean isAvailable()`
- `void put(String, Object)`
- `void put(String, Object, Integer)`
- `void put(String, Object, Integer, cache.Visibility, Boolean)`
- `Boolean remove(String)`
- `Boolean remove(System.Type, String)`
- `static void validateCacheBuilder(System.Type)`
- `static void validateKeys(Boolean, List&lt;String&gt;)`
- `static void validateKeyValue(Boolean, String, Object)`
- `static void validateKey(Boolean, String)`
- `static void validatePartitionName(String)`

---

## Canvas

**19 missing signatures across 5 classes**

### Canvas.ApplicationContext

Bytecode has 6 method signatures, docs stub has 0. Missing:

- `String getCanvasUrl()`
- `String getDeveloperName()`
- `String getNamespace()`
- `String getName()`
- `String getVersion()`
- `void setCanvasUrlPath(String)`

### Canvas.CanvasLifecycleHandler

Bytecode has 2 method signatures, docs stub has 0. Missing:

- `Set&lt;Canvas.ContextTypeEnum&gt; excludeContextTypes()`
- `void onRender(Canvas.RenderContext)`

### Canvas.EnvironmentContext

Bytecode has 8 method signatures, docs stub has 0. Missing:

- `void addEntityFields(Set&lt;String&gt;)`
- `void addEntityField(String)`
- `String getDisplayLocation()`
- `List&lt;String&gt; getEntityFields()`
- `String getLocationUrl()`
- `String getParametersAsJSON()`
- `String getSublocation()`
- `void setParametersAsJSON(String)`

### Canvas.RenderContext

Bytecode has 2 method signatures, docs stub has 0. Missing:

- `Canvas.ApplicationContext getApplicationContext()`
- `Canvas.EnvironmentContext getEnvironmentContext()`

### Canvas.Test

Bytecode has 3 method signatures, docs stub has 3. Missing:

- `static Canvas.RenderContext mockRenderContext(Map&lt;String,String&gt;, Map&lt;String,String&gt;)`

---

## ChatterAnswers

**1 missing signature across 1 class**

### ChatterAnswers.AccountCreator

Bytecode has 1 method signature, docs stub has 0. Missing:

- `String createAccount(String, String, Id)`

---

## CommerceExtension

**1 missing signature across 1 class**

### CommerceExtension.ResolutionStrategy

Bytecode has 1 method signature, docs stub has 0. Missing:

- `CommerceExtension.Resolution resolve()`

---

## CommercePayments

**25 missing signatures across 14 classes**

### CommercePayments.AbstractTransactionResponse

Bytecode has 12 method signatures, docs stub has 10. Missing:

- `void setRetryCategory(commercepayments.RetryCategory)`
- `void setRetryDecision(commercepayments.RetryDecision)`

### CommercePayments.AuthorizationResponse

Bytecode has 16 method signatures, docs stub has 14. Missing:

- `void setRetryCategory(commercepayments.RetryCategory)`
- `void setRetryDecision(commercepayments.RetryDecision)`

### CommercePayments.AuthorizationReversalResponse

Bytecode has 12 method signatures, docs stub has 10. Missing:

- `void setRetryCategory(commercepayments.RetryCategory)`
- `void setRetryDecision(commercepayments.RetryDecision)`

### CommercePayments.BaseNotification

Bytecode has 14 method signatures, docs stub has 12. Missing:

- `void setRetryCategory(commercepayments.RetryCategory)`
- `void setRetryDecision(commercepayments.RetryDecision)`

### CommercePayments.CaptureNotification

Bytecode has 14 method signatures, docs stub has 12. Missing:

- `void setRetryCategory(commercepayments.RetryCategory)`
- `void setRetryDecision(commercepayments.RetryDecision)`

### CommercePayments.CaptureResponse

Bytecode has 13 method signatures, docs stub has 11. Missing:

- `void setRetryCategory(commercepayments.RetryCategory)`
- `void setRetryDecision(commercepayments.RetryDecision)`

### CommercePayments.PaymentGatewayAdapter

Bytecode has 1 method signature, docs stub has 0. Missing:

- `commercepayments.GatewayResponse processRequest(commercepayments.PaymentGatewayContext)`

### CommercePayments.PaymentGatewayAsyncAdapter

Bytecode has 1 method signature, docs stub has 0. Missing:

- `commercepayments.GatewayNotificationResponse processNotification(commercepayments.PaymentGatewayNotificationContext)`

### CommercePayments.PaymentMethodTokenizationResponse

Bytecode has 19 method signatures, docs stub has 17. Missing:

- `void setRetryCategory(commercepayments.RetryCategory)`
- `void setRetryDecision(commercepayments.RetryDecision)`

### CommercePayments.PaymentsHttp

Bytecode has 2 method signatures, docs stub has 2. Missing:

- `void setExcludeResponseLogging(Boolean)`

### CommercePayments.PostAuthorizationResponse

Bytecode has 17 method signatures, docs stub has 16. Missing:

- `void setRetryCategory(commercepayments.RetryCategory)`
- `void setRetryDecision(commercepayments.RetryDecision)`

### CommercePayments.ReferencedRefundNotification

Bytecode has 14 method signatures, docs stub has 12. Missing:

- `void setRetryCategory(commercepayments.RetryCategory)`
- `void setRetryDecision(commercepayments.RetryDecision)`

### CommercePayments.ReferencedRefundResponse

Bytecode has 13 method signatures, docs stub has 11. Missing:

- `void setRetryCategory(commercepayments.RetryCategory)`
- `void setRetryDecision(commercepayments.RetryDecision)`

### CommercePayments.TokenizeNotification

Bytecode has 16 method signatures, docs stub has 14. Missing:

- `void setRetryCategory(commercepayments.RetryCategory)`
- `void setRetryDecision(commercepayments.RetryDecision)`

---

## CommerceTax

**10 missing signatures across 10 classes**

### CommerceTax.AddressesResponse

Bytecode has 5 method signatures, docs stub has 4. Missing:

- `java:commerce.tax.impl.engine.integration.response.AddressesEngineResponse getDelegate()`

### CommerceTax.AmountDetailsResponse

Bytecode has 6 method signatures, docs stub has 5. Missing:

- `java:commerce.tax.impl.engine.integration.response.AmountDetailsEngineResponse getDelegate()`

### CommerceTax.CalculateTaxResponse

Bytecode has 17 method signatures, docs stub has 16. Missing:

- `void setCustomTaxAttributes(commercetax.CustomTaxAttributesResponse)`

### CommerceTax.CustomTaxAttributesResponse

Bytecode has 2 method signatures, docs stub has 2. Missing:

- `void setData(Map&lt;String,ANY&gt;)`

### CommerceTax.ImpositionResponse

Bytecode has 6 method signatures, docs stub has 5. Missing:

- `java:commerce.tax.impl.engine.integration.response.ImpositionEngineResponse getDelegate()`

### CommerceTax.JurisdictionResponse

Bytecode has 8 method signatures, docs stub has 7. Missing:

- `java:commerce.tax.impl.engine.integration.response.JurisdictionEngineResponse getDelegate()`

### CommerceTax.LineItemResponse

Bytecode has 12 method signatures, docs stub has 11. Missing:

- `java:commerce.tax.impl.engine.integration.response.LineItemEngineResponse getDelegate()`

### CommerceTax.RuleDetailsResponse

Bytecode has 7 method signatures, docs stub has 6. Missing:

- `java:commerce.tax.impl.engine.integration.response.RuleDetailsEngineResponse getDelegate()`

### CommerceTax.TaxDetailsResponse

Bytecode has 15 method signatures, docs stub has 14. Missing:

- `java:commerce.tax.impl.engine.integration.response.TaxDetailsEngineResponse getDelegate()`

### CommerceTax.TaxEngineAdapter

Bytecode has 1 method signature, docs stub has 0. Missing:

- `commercetax.TaxEngineResponse processRequest(commercetax.TaxEngineContext)`

---

## ConnectApi

**572 missing signatures across 56 classes**

### ConnectApi.BatchInput

Bytecode has 3 method signatures, docs stub has 1. Missing:

- `List&lt;ConnectApi.BinaryInput&gt; getBinaries()`
- `Object getInput()`

### ConnectApi.BinaryInput

Bytecode has 4 method signatures, docs stub has 1. Missing:

- `Blob getBlobValue()`
- `String getContentType()`
- `String getFilename()`

### ConnectApi.CartItem

Bytecode has 41 method signatures, docs stub has 1. Missing:

- `ConnectApi.CartItemCollection getCartData()`
- `String getCurrencyIsoCode()`
- `String getFirstPymtTotalAmount()`
- `String getFirstPymtTotalListPrice()`
- `String getFirstPymtTotalPrice()`
- `String getFirstPymtTotalTax()`
- `String getItemizedAdjustmentAmount()`
- `String getListPrice()`
- `ConnectApi.ProductClass getProductClass()`
- `String getQuoteLineItemId()`
- `String getSalesPrice()`
- `String getTotalAdjustmentAmount()`
- `String getTotalAmount()`
- `String getTotalListPrice()`
- `String getTotalPrice()`
- `String getTotalTax()`
- `String getUnitAdjustedPriceWithItemAdj()`
- `String getUnitAdjustedPrice()`
- `String getUnitAdjustmentAmount()`
- `String getUnitItemAdjustmentAmount()`
- `void setCartData(ConnectApi.CartItemCollection)`
- `void setCurrencyIsoCode(String)`
- `void setFirstPymtTotalAmount(String)`
- `void setFirstPymtTotalListPrice(String)`
- `void setFirstPymtTotalPrice(String)`
- `void setFirstPymtTotalTax(String)`
- `void setItemizedAdjustmentAmount(String)`
- `void setListPrice(String)`
- `void setProductClass(ConnectApi.ProductClass)`
- `void setQuoteLineItemId(String)`
- `void setSalesPrice(String)`
- `void setTotalAdjustmentAmount(String)`
- `void setTotalAmount(String)`
- `void setTotalListPrice(String)`
- `void setTotalPrice(String)`
- `void setTotalTax(String)`
- `void setUnitAdjustedPriceWithItemAdj(String)`
- `void setUnitAdjustedPrice(String)`
- `void setUnitAdjustmentAmount(String)`
- `void setUnitItemAdjustmentAmount(String)`

### ConnectApi.CartItemCollection

Bytecode has 35 method signatures, docs stub has 1. Missing:

- `List&lt;String&gt; getApproachingDiscounts()`
- `ConnectApi.CartCouponCollection getCartCoupons()`
- `List&lt;ConnectApi.CartItemResult&gt; getCartItems()`
- `ConnectApi.CartPromotionCollection getCartPromotions()`
- `ConnectApi.CartSummary getCartSummary()`
- `String getCheckoutUrl()`
- `Integer getCount()`
- `String getCurrentPageToken()`
- `String getCurrentPageUrl()`
- `Integer getCurrentPage()`
- `Boolean getHasErrors()`
- `String getNextPageToken()`
- `String getNextPageUrl()`
- `String getPreviousPageToken()`
- `String getPreviousPageUrl()`
- `Integer getTotalNumberOfPages()`
- `Integer getTotal()`
- `void setApproachingDiscounts(List&lt;String&gt;)`
- `void setCartCoupons(ConnectApi.CartCouponCollection)`
- `void setCartItems(List&lt;ConnectApi.CartItemResult&gt;)`
- `void setCartPromotions(ConnectApi.CartPromotionCollection)`
- `void setCartSummary(ConnectApi.CartSummary)`
- `void setCheckoutUrl(String)`
- `void setCount(Integer)`
- `void setCurrentPageToken(String)`
- `void setCurrentPageUrl(String)`
- `void setCurrentPage(Integer)`
- `void setHasErrors(Boolean)`
- `void setNextPageToken(String)`
- `void setNextPageUrl(String)`
- `void setPreviousPageToken(String)`
- `void setPreviousPageUrl(String)`
- `void setTotalNumberOfPages(Integer)`
- `void setTotal(Integer)`

### ConnectApi.CartItemInput

Bytecode has 17 method signatures, docs stub has 1. Missing:

- `String getCartDeliveryGroupId()`
- `List&lt;SObject&gt; getCustomFields()`
- `String getParentProductId()`
- `String getProductId()`
- `String getProductSellingModelId()`
- `String getQuantity()`
- `Integer getSubscriptionTerm()`
- `ConnectApi.CartItemType getType()`
- `void setCartDeliveryGroupId(String)`
- `void setCustomFields(List&lt;SObject&gt;)`
- `void setParentProductId(String)`
- `void setProductId(String)`
- `void setProductSellingModelId(String)`
- `void setQuantity(String)`
- `void setSubscriptionTerm(Integer)`
- `void setType(ConnectApi.CartItemType)`

### ConnectApi.CdpCalculatedInsight

Bytecode has 14 method signatures, docs stub has 8. Missing:

- `static ConnectApi.CdpCalculatedInsightOutput cloneCalculatedInsight(String)`
- `static ConnectApi.CdpCalculatedInsightOutput createCalculatedInsight(ConnectApi.CdpCalculatedInsightInput, Boolean)`
- `static void deleteCalculatedInsight(String, Boolean)`
- `static ConnectApi.CdpCalculatedInsightOutput deployCalculatedInsightFromPackage(String)`
- `static ConnectApi.CdpCalculatedInsightStandardActionResponseRepresentation disableCalculatedInsight(String)`
- `static ConnectApi.CdpCalculatedInsightStandardActionResponseRepresentation enableCalculatedInsight(String)`
- `static ConnectApi.CdpCalculatedInsightStandardActionResponseRepresentation refreshStatusCalculatedInsight(String)`
- `static ConnectApi.CdpCalculatedInsightOutput updateCalculatedInsight(String, ConnectApi.CdpCalculatedInsightInput, Boolean)`
- `static ConnectApi.CdpCalculatedInsightStandardActionResponseRepresentation validateCalculatedInsight(ConnectApi.CdpCalculatedInsightValidateInput)`

### ConnectApi.CdpSegment

Bytecode has 19 method signatures, docs stub has 15. Missing:

- `static void deleteSegment(String, String)`
- `static ConnectApi.CdpSegmentActionOutput executeCountAsync(String)`
- `static ConnectApi.CdpSegmentActionOutput executeCountAsync(String, ConnectApi.CdpSegmentActionInput)`
- `static ConnectApi.CdpSegmentOutput updateSegment(String, ConnectApi.CdpSegmentInput, String)`

### ConnectApi.ChatterFeeds

Bytecode has 251 method signatures, docs stub has 250. Missing:

- `static void setTestGetFeedItemsFromFilterFeedUpdatedSince(String, String, String, Integer, ConnectApi.FeedDensity, String, Integer, String, ConnectApi.FeedItemPage)`
- `static void setTestSearchFeedItemsInFilterFeed(String, String, String, Integer, ConnectApi.FeedDensity, String, Integer, ConnectApi.FeedSortOrder, String, ConnectApi.FeedItemPage)`
- `static void setTestSearchFeedItemsInFilterFeed(String, String, String, String, Integer, ConnectApi.FeedSortOrder, String, ConnectApi.FeedItemPage)`
- `static void setTestSearchFeedItems(String, String, ConnectApi.FeedItemPage)`

### ConnectApi.ChatterGroups

Bytecode has 57 method signatures, docs stub has 51. Missing:

- `static ConnectApi.ChatterGroupDetail createGroup(String, ConnectApi.ChatterGroupInput)`
- `static ConnectApi.Subscription follow(String, String, String)`
- `static ConnectApi.FollowingPage getFollowings(String, String)`
- `static ConnectApi.FollowingPage getFollowings(String, String, Integer)`
- `static ConnectApi.FollowingPage getFollowings(String, String, Integer, Integer)`
- `static ConnectApi.FollowingPage getFollowings(String, String, String, Integer, Integer)`
- `static void setTestSearchGroups(String, String, ConnectApi.GroupArchiveStatus, Integer, Integer, ConnectApi.ChatterGroupPage)`

### ConnectApi.CommerceAddressCollection

Bytecode has 21 method signatures, docs stub has 1. Missing:

- `Integer getCount()`
- `String getCurrentPageToken()`
- `String getCurrentPageUrl()`
- `List&lt;ConnectApi.CommerceAddressOutput&gt; getItems()`
- `String getNextPageToken()`
- `String getNextPageUrl()`
- `Integer getPageSize()`
- `String getPreviousPageToken()`
- `String getPreviousPageUrl()`
- `ConnectApi.CommerceAddressSort getSortOrder()`
- `void setCount(Integer)`
- `void setCurrentPageToken(String)`
- `void setCurrentPageUrl(String)`
- `void setItems(List&lt;ConnectApi.CommerceAddressOutput&gt;)`
- `void setNextPageToken(String)`
- `void setNextPageUrl(String)`
- `void setPageSize(Integer)`
- `void setPreviousPageToken(String)`
- `void setPreviousPageUrl(String)`
- `void setSortOrder(ConnectApi.CommerceAddressSort)`

### ConnectApi.CommerceAddressInput

Bytecode has 33 method signatures, docs stub has 1. Missing:

- `String getAddressType()`
- `String getCity()`
- `List&lt;ConnectApi.CommerceAddressFieldInput&gt; getCommerceAddressFieldInputList()`
- `String getCompanyName()`
- `String getCountryCode()`
- `String getCountry()`
- `String getFirstName()`
- `Boolean getIsDefault()`
- `String getLastName()`
- `String getMiddleName()`
- `String getName()`
- `String getPhoneNumber()`
- `String getPostalCode()`
- `String getRegionCode()`
- `String getRegion()`
- `String getStreet()`
- `void setAddressType(String)`
- `void setCity(String)`
- `void setCommerceAddressFieldInputList(List&lt;ConnectApi.CommerceAddressFieldInput&gt;)`
- `void setCompanyName(String)`
- `void setCountryCode(String)`
- `void setCountry(String)`
- `void setFirstName(String)`
- `void setIsDefault(Boolean)`
- `void setLastName(String)`
- `void setMiddleName(String)`
- `void setName(String)`
- `void setPhoneNumber(String)`
- `void setPostalCode(String)`
- `void setRegionCode(String)`
- `void setRegion(String)`
- `void setStreet(String)`

### ConnectApi.CommerceAddressOutput

Bytecode has 35 method signatures, docs stub has 1. Missing:

- `String getAddressId()`
- `String getAddressType()`
- `String getCity()`
- `String getCompanyName()`
- `String getCountryCode()`
- `String getCountry()`
- `Map&lt;String,ConnectApi.RecordField&gt; getFields()`
- `String getFirstName()`
- `Boolean getIsDefault()`
- `String getLastName()`
- `String getMiddleName()`
- `String getName()`
- `String getPhoneNumber()`
- `String getPostalCode()`
- `String getRegionCode()`
- `String getRegion()`
- `String getStreet()`
- `void setAddressId(String)`
- `void setAddressType(String)`
- `void setCity(String)`
- `void setCompanyName(String)`
- `void setCountryCode(String)`
- `void setCountry(String)`
- `void setFields(Map&lt;String,ConnectApi.RecordField&gt;)`
- `void setFirstName(String)`
- `void setIsDefault(Boolean)`
- `void setLastName(String)`
- `void setMiddleName(String)`
- `void setName(String)`
- `void setPhoneNumber(String)`
- `void setPostalCode(String)`
- `void setRegionCode(String)`
- `void setRegion(String)`
- `void setStreet(String)`

### ConnectApi.CommerceProductSearchResults

Bytecode has 11 method signatures, docs stub has 1. Missing:

- `ConnectApi.SearchCategory getCategories()`
- `String getCorrelationId()`
- `List&lt;ConnectApi.SearchFacet&gt; getFacets()`
- `String getLocale()`
- `ConnectApi.CommerceProductSummaryPage getProductsPage()`
- `void setCategories(ConnectApi.SearchCategory)`
- `void setCorrelationId(String)`
- `void setFacets(List&lt;ConnectApi.SearchFacet&gt;)`
- `void setLocale(String)`
- `void setProductsPage(ConnectApi.CommerceProductSummaryPage)`

### ConnectApi.CommerceProductSellingModel

Bytecode has 3 method signatures, docs stub has 1. Missing:

- `Boolean getIsSubscriptionProduct()`
- `void setIsSubscriptionProduct(Boolean)`

### ConnectApi.CommerceProductSummary

Bytecode has 23 method signatures, docs stub has 1. Missing:

- `ConnectApi.ProductMedia getDefaultImage()`
- `Map&lt;String,ConnectApi.FieldValue&gt; getFields()`
- `String getId()`
- `Boolean getIsConfigurationAllowed()`
- `String getName()`
- `ConnectApi.ProductClass getProductClass()`
- `ConnectApi.CommerceProductSellingModel getProductSellingModelInformation()`
- `ConnectApi.ProductVariationInfo getProductVariationInfo()`
- `ConnectApi.PurchaseQuantityRule getPurchaseQuantityRule()`
- `String getUrlName()`
- `ConnectApi.CommerceProductAttributeSetSummary getVariationAttributeSet()`
- `void setDefaultImage(ConnectApi.ProductMedia)`
- `void setFields(Map&lt;String,ConnectApi.FieldValue&gt;)`
- `void setId(String)`
- `void setIsConfigurationAllowed(Boolean)`
- `void setName(String)`
- `void setProductClass(ConnectApi.ProductClass)`
- `void setProductSellingModelInformation(ConnectApi.CommerceProductSellingModel)`
- `void setProductVariationInfo(ConnectApi.ProductVariationInfo)`
- `void setPurchaseQuantityRule(ConnectApi.PurchaseQuantityRule)`
- `void setUrlName(String)`
- `void setVariationAttributeSet(ConnectApi.CommerceProductAttributeSetSummary)`

### ConnectApi.CommerceProductSummaryPage

Bytecode has 7 method signatures, docs stub has 1. Missing:

- `Integer getPageSize()`
- `List&lt;ConnectApi.CommerceProductSummary&gt; getProducts()`
- `Long getTotal()`
- `void setPageSize(Integer)`
- `void setProducts(List&lt;ConnectApi.CommerceProductSummary&gt;)`
- `void setTotal(Long)`

### ConnectApi.Communities

Bytecode has 5 method signatures, docs stub has 4. Missing:

- `static ConnectApi.CommunityTemplates getCommunityTemplates()`

### ConnectApi.CommunityModeration

Bytecode has 24 method signatures, docs stub has 24. Missing:

- `static void removeFlagFromFeedItem(String, String, String)`

### ConnectApi.ConnectApiException

Bytecode has 2 method signatures, docs stub has 1. Missing:

- `String getErrorCode()`

### ConnectApi.ContentHub

Bytecode has 69 method signatures, docs stub has 65. Missing:

- `static void deleteRepositoryFile(String, String)`
- `static void deleteRepositoryFile(String, String, String)`
- `static void deleteRepositoryFolder(String, String)`
- `static void deleteRepositoryFolder(String, String, String)`

### ConnectApi.DistinctFacetValue

Bytecode has 11 method signatures, docs stub has 1. Missing:

- `ConnectApi.DistinctFacetValueDisplayMetadataRepresentation getDisplayMetadata()`
- `String getDisplayName()`
- `String getNameOrId()`
- `Long getProductCount()`
- `ConnectApi.CommerceSearchFacetType getType()`
- `void setDisplayMetadata(ConnectApi.DistinctFacetValueDisplayMetadataRepresentation)`
- `void setDisplayName(String)`
- `void setNameOrId(String)`
- `void setProductCount(Long)`
- `void setType(ConnectApi.CommerceSearchFacetType)`

### ConnectApi.DistinctFacetValueDisplayMetadataRepresentation

Bytecode has 3 method signatures, docs stub has 1. Missing:

- `Map&lt;String,String&gt; getSwatch()`
- `void setSwatch(Map&lt;String,String&gt;)`

### ConnectApi.DistinctValueRefinementInput

Bytecode has 9 method signatures, docs stub has 1. Missing:

- `ConnectApi.CommerceSearchAttributeType getAttributeType()`
- `String getNameOrId()`
- `ConnectApi.CommerceSearchFacetType getType()`
- `List&lt;String&gt; getValues()`
- `void setAttributeType(ConnectApi.CommerceSearchAttributeType)`
- `void setNameOrId(String)`
- `void setType(ConnectApi.CommerceSearchFacetType)`
- `void setValues(List&lt;String&gt;)`

### ConnectApi.DistinctValueSearchFacet

Bytecode has 15 method signatures, docs stub has 1. Missing:

- `ConnectApi.CommerceSearchAttributeType getAttributeType()`
- `String getDisplayName()`
- `Integer getDisplayRank()`
- `ConnectApi.CommerceSearchFacetDisplayType getDisplayType()`
- `ConnectApi.CommerceSearchFacetType getFacetType()`
- `String getNameOrId()`
- `List&lt;ConnectApi.DistinctFacetValue&gt; getValues()`
- `void setAttributeType(ConnectApi.CommerceSearchAttributeType)`
- `void setDisplayName(String)`
- `void setDisplayRank(Integer)`
- `void setDisplayType(ConnectApi.CommerceSearchFacetDisplayType)`
- `void setFacetType(ConnectApi.CommerceSearchFacetType)`
- `void setNameOrId(String)`
- `void setValues(List&lt;ConnectApi.DistinctFacetValue&gt;)`

### ConnectApi.FacetValue

Bytecode has 3 method signatures, docs stub has 1. Missing:

- `ConnectApi.CommerceSearchFacetType getType()`
- `void setType(ConnectApi.CommerceSearchFacetType)`

### ConnectApi.FieldValue

Bytecode has 3 method signatures, docs stub has 1. Missing:

- `String getValue()`
- `void setValue(String)`

### ConnectApi.ManagedContent

Bytecode has 39 method signatures, docs stub has 34. Missing:

- `static ConnectApi.ManagedContentVersionOutput createManagedContentVersion(String, ConnectApi.ManagedContentVersionInput)`
- `static ConnectApi.ManagedContentVersionOutput createManagedContentVersion(String, ConnectApi.ManagedContentVersionInput, ConnectApi.BinaryInput)`
- `static void deleteManagedContentSpace(String)`
- `static void deleteManagedContent(String, String)`
- `static ConnectApi.ManagedContentOutput updateManagedContent(String, String, ConnectApi.ManagedContentInput)`

### ConnectApi.ManagedContentSpaces

Bytecode has 9 method signatures, docs stub has 7. Missing:

- `static ConnectApi.ManagedContentSpaceCollectionRepresentation getManagedContentSpacesByBusinessUnitStatus(Integer, Integer, String, String, Boolean, ConnectApi.ConnectManagedContentSpaceType, String)`
- `static ConnectApi.ManagedContentSpaceCollectionRepresentation getManagedContentSpaces(Integer, Integer, String, String, Boolean, ConnectApi.ConnectManagedContentSpaceType)`

### ConnectApi.PricingResultLineItem

Bytecode has 19 method signatures, docs stub has 1. Missing:

- `String getContractId()`
- `String getContractItemPriceId()`
- `ConnectApi.ErrorResponse getError()`
- `String getListPrice()`
- `String getLowestUnitPrice()`
- `String getPricebookEntryId()`
- `String getProductId()`
- `Boolean getSuccess()`
- `String getUnitPrice()`
- `void setContractId(String)`
- `void setContractItemPriceId(String)`
- `void setError(ConnectApi.ErrorResponse)`
- `void setListPrice(String)`
- `void setLowestUnitPrice(String)`
- `void setPricebookEntryId(String)`
- `void setProductId(String)`
- `void setSuccess(Boolean)`
- `void setUnitPrice(String)`

### ConnectApi.ProductAttributeInfo

Bytecode has 21 method signatures, docs stub has 1. Missing:

- `List&lt;String&gt; getAllowableValues()`
- `String getApiName()`
- `List&lt;String&gt; getAvailableValues()`
- `String getFieldEnumOrId()`
- `Boolean getGroupedBy()`
- `String getLabel()`
- `String getObjectName()`
- `List&lt;ConnectApi.ProductAttributeValueMetadataRepresentation&gt; getOptions()`
- `Integer getSequence()`
- `ConnectApi.ProductAttributeViewType getViewType()`
- `void setAllowableValues(List&lt;String&gt;)`
- `void setApiName(String)`
- `void setAvailableValues(List&lt;String&gt;)`
- `void setFieldEnumOrId(String)`
- `void setGroupedBy(Boolean)`
- `void setLabel(String)`
- `void setObjectName(String)`
- `void setOptions(List&lt;ConnectApi.ProductAttributeValueMetadataRepresentation&gt;)`
- `void setSequence(Integer)`
- `void setViewType(ConnectApi.ProductAttributeViewType)`

### ConnectApi.ProductAttributeSelectionInfo

Bytecode has 9 method signatures, docs stub has 1. Missing:

- `String getApiName()`
- `String getLabel()`
- `Integer getSequence()`
- `String getValue()`
- `void setApiName(String)`
- `void setLabel(String)`
- `void setSequence(Integer)`
- `void setValue(String)`

### ConnectApi.ProductAttributeSetSummary

Bytecode has 7 method signatures, docs stub has 1. Missing:

- `String getApiName()`
- `List&lt;ConnectApi.ProductAttributeSummary&gt; getAttributes()`
- `String getLabel()`
- `void setApiName(String)`
- `void setAttributes(List&lt;ConnectApi.ProductAttributeSummary&gt;)`
- `void setLabel(String)`

### ConnectApi.ProductAttributeSummary

Bytecode has 9 method signatures, docs stub has 1. Missing:

- `String getApiName()`
- `String getLabel()`
- `Integer getSequence()`
- `String getValue()`
- `void setApiName(String)`
- `void setLabel(String)`
- `void setSequence(Integer)`
- `void setValue(String)`

### ConnectApi.ProductAttributeValueMetadataRepresentation

Bytecode has 9 method signatures, docs stub has 1. Missing:

- `String getApiName()`
- `String getColorHexCode()`
- `String getLabel()`
- `Boolean getVariantAvailable()`
- `void setApiName(String)`
- `void setColorHexCode(String)`
- `void setLabel(String)`
- `void setVariantAvailable(Boolean)`

### ConnectApi.ProductAttributesToProductEntry

Bytecode has 13 method signatures, docs stub has 1. Missing:

- `String getCanonicalKey()`
- `ConnectApi.ProductMedia getImage()`
- `List&lt;ConnectApi.ProductMedia&gt; getMediaItems()`
- `String getProductId()`
- `List&lt;ConnectApi.ProductAttributeSelectionInfo&gt; getSelectedAttributes()`
- `String getUrlName()`
- `void setCanonicalKey(String)`
- `void setImage(ConnectApi.ProductMedia)`
- `void setMediaItems(List&lt;ConnectApi.ProductMedia&gt;)`
- `void setProductId(String)`
- `void setSelectedAttributes(List&lt;ConnectApi.ProductAttributeSelectionInfo&gt;)`
- `void setUrlName(String)`

### ConnectApi.ProductCategoryData

Bytecode has 9 method signatures, docs stub has 1. Missing:

- `String getDescription()`
- `String getId()`
- `String getName()`
- `String getUrlName()`
- `void setDescription(String)`
- `void setId(String)`
- `void setName(String)`
- `void setUrlName(String)`

### ConnectApi.ProductDetail

Bytecode has 33 method signatures, docs stub has 1. Missing:

- `Map&lt;String,ConnectApi.ProductAttributeSetInfo&gt; getAttributeSetInfo()`
- `ConnectApi.ProductMedia getDefaultImage()`
- `Integer getDynamicAttributeCount()`
- `ConnectApi.ProductEntitlement getEntitlement()`
- `Map&lt;String,String&gt; getFields()`
- `String getId()`
- `Boolean getIsConfigurationAllowed()`
- `List&lt;ConnectApi.ProductMediaGroup&gt; getMediaGroups()`
- `ConnectApi.ProductCategoryPath getPrimaryProductCategoryPath()`
- `ConnectApi.ProductClass getProductClass()`
- `List&lt;ConnectApi.ProductSellingModel&gt; getProductSellingModels()`
- `ConnectApi.PurchaseQuantityRule getPurchaseQuantityRule()`
- `String getUrlName()`
- `ConnectApi.ProductAttributeSet getVariationAttributeSet()`
- `ConnectApi.ProductVariationInfo getVariationInfo()`
- `String getVariationParentId()`
- `void setAttributeSetInfo(Map&lt;String,ConnectApi.ProductAttributeSetInfo&gt;)`
- `void setDefaultImage(ConnectApi.ProductMedia)`
- `void setDynamicAttributeCount(Integer)`
- `void setEntitlement(ConnectApi.ProductEntitlement)`
- `void setFields(Map&lt;String,String&gt;)`
- `void setId(String)`
- `void setIsConfigurationAllowed(Boolean)`
- `void setMediaGroups(List&lt;ConnectApi.ProductMediaGroup&gt;)`
- `void setPrimaryProductCategoryPath(ConnectApi.ProductCategoryPath)`
- `void setProductClass(ConnectApi.ProductClass)`
- `void setProductSellingModels(List&lt;ConnectApi.ProductSellingModel&gt;)`
- `void setPurchaseQuantityRule(ConnectApi.PurchaseQuantityRule)`
- `void setUrlName(String)`
- `void setVariationAttributeSet(ConnectApi.ProductAttributeSet)`
- `void setVariationInfo(ConnectApi.ProductVariationInfo)`
- `void setVariationParentId(String)`

### ConnectApi.ProductMedia

Bytecode has 17 method signatures, docs stub has 1. Missing:

- `String getAlternateText()`
- `String getContentVersionId()`
- `String getId()`
- `ConnectApi.ProductMediaType getMediaType()`
- `Integer getSortOrder()`
- `String getThumbnailUrl()`
- `String getTitle()`
- `String getUrl()`
- `void setAlternateText(String)`
- `void setContentVersionId(String)`
- `void setId(String)`
- `void setMediaType(ConnectApi.ProductMediaType)`
- `void setSortOrder(Integer)`
- `void setThumbnailUrl(String)`
- `void setTitle(String)`
- `void setUrl(String)`

### ConnectApi.ProductOverviewCollection

Bytecode has 5 method signatures, docs stub has 1. Missing:

- `List&lt;ConnectApi.ProductOverview&gt; getProducts()`
- `Integer getTotal()`
- `void setProducts(List&lt;ConnectApi.ProductOverview&gt;)`
- `void setTotal(Integer)`

### ConnectApi.ProductSearchGroupingInput

Bytecode has 5 method signatures, docs stub has 1. Missing:

- `ConnectApi.CommerceSearchGroupingOption getGroupingOption()`
- `ConnectApi.CommerceSearchTopProductType getTopProductType()`
- `void setGroupingOption(ConnectApi.CommerceSearchGroupingOption)`
- `void setTopProductType(ConnectApi.CommerceSearchTopProductType)`

### ConnectApi.ProductSearchInput

Bytecode has 21 method signatures, docs stub has 1. Missing:

- `String getCategoryId()`
- `List&lt;String&gt; getFields()`
- `ConnectApi.ProductSearchGroupingInput getGrouping()`
- `Boolean getIncludePrices()`
- `Boolean getIncludeQuantityRule()`
- `Integer getPageSize()`
- `Integer getPage()`
- `List&lt;ConnectApi.RefinementInput&gt; getRefinements()`
- `String getSearchTerm()`
- `String getSortRuleId()`
- `void setCategoryId(String)`
- `void setFields(List&lt;String&gt;)`
- `void setGrouping(ConnectApi.ProductSearchGroupingInput)`
- `void setIncludePrices(Boolean)`
- `void setIncludeQuantityRule(Boolean)`
- `void setPageSize(Integer)`
- `void setPage(Integer)`
- `void setRefinements(List&lt;ConnectApi.RefinementInput&gt;)`
- `void setSearchTerm(String)`
- `void setSortRuleId(String)`

### ConnectApi.ProductSearchResults

Bytecode has 11 method signatures, docs stub has 1. Missing:

- `ConnectApi.SearchCategory getCategories()`
- `String getCorrelationId()`
- `List&lt;ConnectApi.SearchFacet&gt; getFacets()`
- `String getLocale()`
- `ConnectApi.ProductSummaryPage getProductsPage()`
- `void setCategories(ConnectApi.SearchCategory)`
- `void setCorrelationId(String)`
- `void setFacets(List&lt;ConnectApi.SearchFacet&gt;)`
- `void setLocale(String)`
- `void setProductsPage(ConnectApi.ProductSummaryPage)`

### ConnectApi.ProductSearchSuggestionsResults

Bytecode has 3 method signatures, docs stub has 1. Missing:

- `List&lt;ConnectApi.AbstractSearchSuggestion&gt; getRecentSearchSuggestions()`
- `void setRecentSearchSuggestions(List&lt;ConnectApi.AbstractSearchSuggestion&gt;)`

### ConnectApi.ProductSummary

Bytecode has 21 method signatures, docs stub has 1. Missing:

- `ConnectApi.ProductMedia getDefaultImage()`
- `Map&lt;String,ConnectApi.FieldValue&gt; getFields()`
- `String getId()`
- `String getName()`
- `ConnectApi.PricingResultLineItem getPrices()`
- `ConnectApi.ProductClass getProductClass()`
- `ConnectApi.CommerceProductSellingModel getProductSellingModelInformation()`
- `ConnectApi.PurchaseQuantityRule getPurchaseQuantityRule()`
- `String getUrlName()`
- `ConnectApi.ProductAttributeSetSummary getVariationAttributeSet()`
- `void setDefaultImage(ConnectApi.ProductMedia)`
- `void setFields(Map&lt;String,ConnectApi.FieldValue&gt;)`
- `void setId(String)`
- `void setName(String)`
- `void setPrices(ConnectApi.PricingResultLineItem)`
- `void setProductClass(ConnectApi.ProductClass)`
- `void setProductSellingModelInformation(ConnectApi.CommerceProductSellingModel)`
- `void setPurchaseQuantityRule(ConnectApi.PurchaseQuantityRule)`
- `void setUrlName(String)`
- `void setVariationAttributeSet(ConnectApi.ProductAttributeSetSummary)`

### ConnectApi.ProductSummaryPage

Bytecode has 9 method signatures, docs stub has 1. Missing:

- `String getCurrencyIsoCode()`
- `Integer getPageSize()`
- `List&lt;ConnectApi.ProductSummary&gt; getProducts()`
- `Long getTotal()`
- `void setCurrencyIsoCode(String)`
- `void setPageSize(Integer)`
- `void setProducts(List&lt;ConnectApi.ProductSummary&gt;)`
- `void setTotal(Long)`

### ConnectApi.ProductVariationInfo

Bytecode has 7 method signatures, docs stub has 1. Missing:

- `List&lt;ConnectApi.ProductAttributesToProductEntry&gt; getAttributesToProductMappings()`
- `Map&lt;String,ConnectApi.ProductAttributeInfo&gt; getVariationAttributeInfo()`
- `Integer getVariationCount()`
- `void setAttributesToProductMappings(List&lt;ConnectApi.ProductAttributesToProductEntry&gt;)`
- `void setVariationAttributeInfo(Map&lt;String,ConnectApi.ProductAttributeInfo&gt;)`
- `void setVariationCount(Integer)`

### ConnectApi.PurchaseQuantityRule

Bytecode has 7 method signatures, docs stub has 1. Missing:

- `String getIncrement()`
- `String getMaximum()`
- `String getMinimum()`
- `void setIncrement(String)`
- `void setMaximum(String)`
- `void setMinimum(String)`

### ConnectApi.RangeFacetDisplayMetadataRepresentation

Bytecode has 3 method signatures, docs stub has 1. Missing:

- `Map&lt;String,String&gt; getCurrencyInfo()`
- `void setCurrencyInfo(Map&lt;String,String&gt;)`

### ConnectApi.RangeRefinementInput

Bytecode has 11 method signatures, docs stub has 1. Missing:

- `ConnectApi.CommerceSearchAttributeType getAttributeType()`
- `String getMax()`
- `String getMin()`
- `String getNameOrId()`
- `ConnectApi.CommerceSearchFacetType getType()`
- `void setAttributeType(ConnectApi.CommerceSearchAttributeType)`
- `void setMax(String)`
- `void setMin(String)`
- `void setNameOrId(String)`
- `void setType(ConnectApi.CommerceSearchFacetType)`

### ConnectApi.RangeSearchFacet

Bytecode has 19 method signatures, docs stub has 1. Missing:

- `ConnectApi.CommerceSearchAttributeType getAttributeType()`
- `ConnectApi.RangeFacetDisplayMetadataRepresentation getDisplayMetadata()`
- `String getDisplayName()`
- `Integer getDisplayRank()`
- `ConnectApi.CommerceSearchFacetDisplayType getDisplayType()`
- `ConnectApi.CommerceSearchFacetType getFacetType()`
- `String getMax()`
- `String getMin()`
- `String getNameOrId()`
- `void setAttributeType(ConnectApi.CommerceSearchAttributeType)`
- `void setDisplayMetadata(ConnectApi.RangeFacetDisplayMetadataRepresentation)`
- `void setDisplayName(String)`
- `void setDisplayRank(Integer)`
- `void setDisplayType(ConnectApi.CommerceSearchFacetDisplayType)`
- `void setFacetType(ConnectApi.CommerceSearchFacetType)`
- `void setMax(String)`
- `void setMin(String)`
- `void setNameOrId(String)`

### ConnectApi.RateLimitException

Bytecode has 2 method signatures, docs stub has 1. Missing:

- `String getErrorCode()`

### ConnectApi.RefinementInput

Bytecode has 7 method signatures, docs stub has 1. Missing:

- `ConnectApi.CommerceSearchAttributeType getAttributeType()`
- `String getNameOrId()`
- `ConnectApi.CommerceSearchFacetType getType()`
- `void setAttributeType(ConnectApi.CommerceSearchAttributeType)`
- `void setNameOrId(String)`
- `void setType(ConnectApi.CommerceSearchFacetType)`

### ConnectApi.SearchCategory

Bytecode has 7 method signatures, docs stub has 1. Missing:

- `ConnectApi.ProductCategoryData getCategory()`
- `List&lt;ConnectApi.SearchCategory&gt; getChildren()`
- `Long getProductCount()`
- `void setCategory(ConnectApi.ProductCategoryData)`
- `void setChildren(List&lt;ConnectApi.SearchCategory&gt;)`
- `void setProductCount(Long)`

### ConnectApi.SearchFacet

Bytecode has 13 method signatures, docs stub has 1. Missing:

- `ConnectApi.CommerceSearchAttributeType getAttributeType()`
- `String getDisplayName()`
- `Integer getDisplayRank()`
- `ConnectApi.CommerceSearchFacetDisplayType getDisplayType()`
- `ConnectApi.CommerceSearchFacetType getFacetType()`
- `String getNameOrId()`
- `void setAttributeType(ConnectApi.CommerceSearchAttributeType)`
- `void setDisplayName(String)`
- `void setDisplayRank(Integer)`
- `void setDisplayType(ConnectApi.CommerceSearchFacetDisplayType)`
- `void setFacetType(ConnectApi.CommerceSearchFacetType)`
- `void setNameOrId(String)`

### ConnectApi.SearchSuggestion

Bytecode has 3 method signatures, docs stub has 1. Missing:

- `String getValue()`
- `void setValue(String)`

### ConnectApi.Topics

Bytecode has 40 method signatures, docs stub has 40. Missing:

- `static void setTestGetRecentlyTalkingAboutTopicsForGroup(String, String, ConnectApi.TopicPage)`
- `static void setTestGetTopicSuggestions(String, String, ConnectApi.TopicSuggestionPage)`

---

## DataSource

**19 missing signatures across 6 classes**

### DataSource.Column

Bytecode has 30 method signatures, docs stub has 28. Missing:

- `void logWarning(String)`
- `static DataSource.Column multipicklist(String, List&lt;Map&lt;String,String&gt;&gt;)`
- `static DataSource.Column multipicklist(String, List&lt;Map&lt;String,String&gt;&gt;, Boolean, Boolean)`
- `static DataSource.Column picklist(String, List&lt;Map&lt;String,String&gt;&gt;)`
- `static DataSource.Column picklist(String, List&lt;Map&lt;String,String&gt;&gt;, Boolean, Boolean)`
- `void throwException(String)`

### DataSource.Connection

Bytecode has 8 method signatures, docs stub has 6. Missing:

- `void logWarning(String)`
- `void throwException(String)`

### DataSource.Provider

Bytecode has 6 method signatures, docs stub has 4. Missing:

- `void logWarning(String)`
- `void throwException(String)`

### DataSource.QueryUtils

Bytecode has 6 method signatures, docs stub has 5. Missing:

- `static List&lt;Map&lt;String,ANY&gt;&gt; applyLimitAndOffset(DataSource.QueryContext, List&lt;Map&lt;String,ANY&gt;&gt;)`
- `static List&lt;Map&lt;String,ANY&gt;&gt; filterAndSort(DataSource.QueryContext, List&lt;Map&lt;String,ANY&gt;&gt;)`
- `static List&lt;Map&lt;String,ANY&gt;&gt; filter(DataSource.QueryContext, List&lt;Map&lt;String,ANY&gt;&gt;)`
- `static List&lt;Map&lt;String,ANY&gt;&gt; process(DataSource.QueryContext, List&lt;Map&lt;String,ANY&gt;&gt;)`
- `static List&lt;Map&lt;String,ANY&gt;&gt; sort(DataSource.QueryContext, List&lt;Map&lt;String,ANY&gt;&gt;)`

### DataSource.Table

Bytecode has 5 method signatures, docs stub has 3. Missing:

- `void logWarning(String)`
- `void throwException(String)`

### DataSource.TableResult

Bytecode has 6 method signatures, docs stub has 5. Missing:

- `static DataSource.TableResult get(DataSource.QueryContext, List&lt;Map&lt;String,ANY&gt;&gt;)`
- `static DataSource.TableResult get(Boolean, String, String, List&lt;Map&lt;String,ANY&gt;&gt;)`

---

## DataWeave

**2 missing signatures across 1 class**

### DataWeave.Script

Bytecode has 5 method signatures, docs stub has 3. Missing:

- `dataweave.Result execute()`
- `dataweave.Result execute(Map&lt;String,ANY&gt;)`

---

## Database

**17 missing signatures across 4 classes**

### Database.Batchable

Bytecode has 3 method signatures, docs stub has 0. Missing:

- `void execute(Database.BatchableContext, List&lt;ANY&gt;)`
- `void finish(Database.BatchableContext)`
- `System.Iterable start(Database.BatchableContext)`

### Database.BatchableContext

Bytecode has 2 method signatures, docs stub has 0. Missing:

- `Id getChildJobId()`
- `Id getJobId()`

### Database.LeadConvert

Bytecode has 34 method signatures, docs stub has 24. Missing:

- `SObject getAccountRecord()`
- `Boolean getBypassAccountDedupeCheck()`
- `Boolean getBypassContactDedupeCheck()`
- `SObject getContactRecord()`
- `SObject getOpportunityRecord()`
- `void setAccountRecord(SObject)`
- `void setBypassAccountDedupeCheck(Boolean)`
- `void setBypassContactDedupeCheck(Boolean)`
- `void setContactRecord(SObject)`
- `void setOpportunityRecord(SObject)`
- `void setRelatedPersonAccountRecord(SObject)`

### Database.QueryLocator

Bytecode has 3 method signatures, docs stub has 3. Missing:

- `List&lt;SObject&gt; querymore(Integer)`

---

## Datacloud

**1 missing signature across 1 class**

### Datacloud.DuplicateResult

Bytecode has 5 method signatures, docs stub has 5. Missing:

- `String getDuplicateRuleEntityType()`

---

## EventBus

**28 missing signatures across 5 classes**

### EventBus.ChangeEventHeader

Bytecode has 24 method signatures, docs stub has 1. Missing:

- `List&lt;String&gt; getChangedFields()`
- `String getChangeOrigin()`
- `String getChangeType()`
- `Long getCommitNumber()`
- `Long getCommitTimestamp()`
- `String getCommitUser()`
- `List&lt;String&gt; getDiffFields()`
- `String getEntityName()`
- `List&lt;String&gt; getNulledFields()`
- `List&lt;String&gt; getRecordIds()`
- `Integer getSequenceNumber()`
- `String getTransactionKey()`
- `void setChangedFields(List&lt;String&gt;)`
- `void setChangeOrigin(String)`
- `void setChangeType(String)`
- `void setCommitNumber(Long)`
- `void setCommitTimestamp(Long)`
- `void setCommitUser(String)`
- `void setDiffFields(List&lt;String&gt;)`
- `void setEntityName(String)`
- `void setNulledFields(List&lt;String&gt;)`
- `void setRecordIds(List&lt;String&gt;)`
- `void setSequenceNumber(Integer)`
- `void setTransactionKey(String)`

### EventBus.EventPublishFailureCallback

Bytecode has 1 method signature, docs stub has 0. Missing:

- `void onFailure(eventbus.FailureResult)`

### EventBus.EventPublishSuccessCallback

Bytecode has 1 method signature, docs stub has 0. Missing:

- `void onSuccess(eventbus.SuccessResult)`

### EventBus.FailureResult

Bytecode has 1 method signature, docs stub has 0. Missing:

- `List&lt;String&gt; getEventUuids()`

### EventBus.SuccessResult

Bytecode has 1 method signature, docs stub has 0. Missing:

- `List&lt;String&gt; getEventUuids()`

---

## Flow

**1 missing signature across 1 class**

### Flow.Interview

Bytecode has 5 method signatures, docs stub has 5. Missing:

- `static Flow.Interview createInterview(String, Map&lt;String,ANY&gt;)`

---

## Functions

**7 missing signatures across 4 classes**

### Functions.FunctionCallback

Bytecode has 1 method signature, docs stub has 0. Missing:

- `void handleResponse(functions.FunctionInvocation)`

### Functions.FunctionInvocation

Bytecode has 4 method signatures, docs stub has 0. Missing:

- `functions.FunctionInvocationError getError()`
- `String getInvocationId()`
- `String getResponse()`
- `functions.FunctionInvocationStatus getStatus()`

### Functions.FunctionInvocationError

Bytecode has 1 method signature, docs stub has 0. Missing:

- `functions.FunctionErrorType getType()`

### Functions.FunctionInvokeMock

Bytecode has 1 method signature, docs stub has 0. Missing:

- `functions.FunctionInvocation respond(String, String)`

---

## Invocable

**3 missing signatures across 1 class**

### Invocable.Action

Bytecode has 17 method signatures, docs stub has 63. Missing:

- `static Invocable.Action createCustomAction(String, String, String, String)`
- `static Invocable.Action createStandardAction(String, String)`
- `Invocable.Action setInvocations(List&lt;Map&lt;String,ANY&gt;&gt;)`

---

## LxScheduler

**1 missing signature across 1 class**

### LxScheduler.ServiceResourceScheduleHandler

Bytecode has 1 method signature, docs stub has 0. Missing:

- `List&lt;lxscheduler.ServiceResourceSchedule&gt; getUnavailableTimeslots(lxscheduler.ServiceAppointmentRequestInfo)`

---

## Messaging

**68 missing signatures across 7 classes**

### Messaging.CustomNotification

Bytecode has 9 method signatures, docs stub has 8. Missing:

- `void setActionGroup(String)`

### Messaging.EmailFileAttachment

Bytecode has 9 method signatures, docs stub has 1. Missing:

- `Blob getBody()`
- `String getContentType()`
- `String getFileName()`
- `Id getId()`
- `Boolean getInline()`
- `void setBody(Blob)`
- `void setContentType(String)`
- `void setFileName(String)`
- `void setInline(Boolean)`

### Messaging.MassEmailMessage

Bytecode has 22 method signatures, docs stub has 4. Missing:

- `Boolean getBccSender()`
- `String getDescription()`
- `String getEmailPriority()`
- `String getReplyTo()`
- `Boolean getSaveAsActivity()`
- `String getSenderDisplayName()`
- `String getSubject()`
- `List&lt;Id&gt; getTargetObjectIds()`
- `Id getTemplateId()`
- `Boolean getUseSignature()`
- `List&lt;Id&gt; getWhatIds()`
- `void setBccSender(Boolean)`
- `void setEmailPriority(String)`
- `void setReplyTo(String)`
- `void setSaveAsActivity(Boolean)`
- `void setSenderDisplayName(String)`
- `void setSubject(String)`
- `void setTemplateId(Id)`
- `void setUseSignature(Boolean)`

### Messaging.NotificationActionHandler

Bytecode has 1 method signature, docs stub has 0. Missing:

- `Messaging.ActionResult executeAction(Messaging.ActionableNotification)`

### Messaging.PushNotification

Bytecode has 4 method signatures, docs stub has 4. Missing:

- `void setPayload(Map&lt;String,ANY&gt;)`

### Messaging.PushNotificationPayload

Bytecode has 3 method signatures, docs stub has 3. Missing:

- `static Map&lt;String,ANY&gt; apple(String, String, Integer, Map&lt;String,ANY&gt;)`
- `static Map&lt;String,ANY&gt; apple(String, String, String, List&lt;String&gt;, String, String, Integer, Map&lt;String,ANY&gt;)`

### Messaging.SingleEmailMessage

Bytecode has 58 method signatures, docs stub has 25. Missing:

- `List&lt;String&gt; getBccAddresses()`
- `Boolean getBccSender()`
- `List&lt;String&gt; getCcAddresses()`
- `String getCharset()`
- `Map&lt;String,String&gt; getCustomHeaders()`
- `String getEmailPriority()`
- `List&lt;String&gt; getEntityAttachments()`
- `List&lt;Messaging.EmailFileAttachment&gt; getFileAttachments()`
- `String getHtmlBody()`
- `String getInReplyTo()`
- `String getOptOutPolicy()`
- `Id getOrgWideEmailAddressId()`
- `String getPlainTextBody()`
- `String getReferences()`
- `String getReplyTo()`
- `Boolean getSaveAsActivity()`
- `String getSenderDisplayName()`
- `String getSubject()`
- `Id getTargetObjectId()`
- `Id getTemplateId()`
- `List&lt;String&gt; getToAddresses()`
- `String getUnsubscribeComment()`
- `List&lt;String&gt; getUnsubscribeUrls()`
- `Boolean getUseSignature()`
- `Id getWhatId()`
- `Boolean isTreatBodiesAsTemplate()`
- `Boolean isTreatTargetObjectAsRecipient()`
- `Boolean isUserMail()`
- `void setBccSender(Boolean)`
- `void setCustomHeaders(Map&lt;String,String&gt;)`
- `void setEmailPriority(String)`
- `void setReplyTo(String)`
- `void setSaveAsActivity(Boolean)`
- `void setSenderDisplayName(String)`
- `void setUseSignature(Boolean)`

---

## Metadata

**2 missing signatures across 2 classes**

### Metadata.DeployCallback

Bytecode has 1 method signature, docs stub has 0. Missing:

- `void handleResult(Metadata.DeployResult, Metadata.DeployCallbackContext)`

### Metadata.Operations

Bytecode has 3 method signatures, docs stub has 2. Missing:

- `static Id enqueueDeployment(Metadata.DeployContainer, Metadata.DeployCallback)`

---

## Pref_center

**3 missing signatures across 2 classes**

### Pref_center.PreferenceCenterApexHandler

Bytecode has 2 method signatures, docs stub has 0. Missing:

- `pref_center.LoadFormData load(pref_center.LoadParameters, pref_center.LoadFormData, pref_center.ValidationResult)`
- `void submit(pref_center.SubmitParameters, pref_center.SubmitFormData, pref_center.ValidationResult)`

### Pref_center.TokenUtility

Bytecode has 6 method signatures, docs stub has 5. Missing:

- `static Map&lt;String,String&gt; generateTokens(List&lt;String&gt;, pref_center.TokenType, pref_center.DataCloudIdTokenType)`

---

## Process

**2 missing signatures across 1 class**

### Process.Plugin

Bytecode has 2 method signatures, docs stub has 0. Missing:

- `Process.PluginDescribeResult describe()`
- `Process.PluginResult invoke(Process.PluginRequest)`

---

## QuickAction

**12 missing signatures across 6 classes**

### QuickAction.DescribeLayoutItem

Bytecode has 7 method signatures, docs stub has 7. Missing:

- `String getUiBehavior()`

### QuickAction.DescribeLayoutSection

Bytecode has 10 method signatures, docs stub has 10. Missing:

- `String getTabOrder()`

### QuickAction.DescribeQuickActionResult

Bytecode has 34 method signatures, docs stub has 32. Missing:

- `String getAccessLevelRequired()`
- `String getCanvasApplicationId()`
- `String getMobileExtensionId()`
- `List&lt;QuickAction.DescribeQuickActionParameter&gt; getParameters()`

### QuickAction.QuickActionDefaultsHandler

Bytecode has 1 method signature, docs stub has 0. Missing:

- `void onInitDefaults(List&lt;QuickAction.QuickActionDefaults&gt;)`

### QuickAction.QuickActionResult

Bytecode has 6 method signatures, docs stub has 6. Missing:

- `Id getContextId()`

### QuickAction.SendEmailQuickActionDefaults

Bytecode has 10 method signatures, docs stub has 6. Missing:

- `String getActionName()`
- `String getActionType()`
- `Id getContextId()`
- `SObject getTargetSObject()`

---

## Reports

**11 missing signatures across 7 classes**

### Reports.GroupingInfo

Bytecode has 9 method signatures, docs stub has 5. Missing:

- `void setDateGranularity(String)`
- `void setName(String)`
- `void setSortAggregate(String)`
- `void setSortOrder(String)`

### Reports.InvalidFilterException

Bytecode has 2 method signatures, docs stub has 1. Missing:

- `List&lt;String&gt; getFilterErrors()`

### Reports.InvalidReportMetadataException

Bytecode has 2 method signatures, docs stub has 1. Missing:

- `List&lt;String&gt; getReportMetadataErrors()`

### Reports.InvalidSnapshotDateException

Bytecode has 2 method signatures, docs stub has 1. Missing:

- `List&lt;String&gt; getSnapshotDateErrors()`

### Reports.NotificationAction

Bytecode has 1 method signature, docs stub has 0. Missing:

- `void execute(reports.NotificationActionContext)`

### Reports.ReportMetadata

Bytecode has 55 method signatures, docs stub has 55. Missing:

- `void setCustomSummaryFormula(Map&lt;String,reports.ReportCsf&gt;)`

### Reports.ReportType

Bytecode has 5 method signatures, docs stub has 3. Missing:

- `void setLabel(String)`
- `void setType(String)`

---

## RichMessaging

**3 missing signatures across 3 classes**

### RichMessaging.AuthRequestHandler

Bytecode has 1 method signature, docs stub has 0. Missing:

- `RichMessaging.AuthRequestResult handleAuthRequest(RichMessaging.AuthRequestResponse)`

### RichMessaging.ProcessFormHandler

Bytecode has 1 method signature, docs stub has 0. Missing:

- `Id processFormRequest(RichMessaging.ProcessFormResponse)`

### RichMessaging.ProcessPaymentHandler

Bytecode has 1 method signature, docs stub has 0. Missing:

- `RichMessaging.ProcessPaymentResult processPaymentRequest(RichMessaging.ProcessPaymentRequest)`

---

## Schema

**20 missing signatures across 5 classes**

### Schema.ChildRelationship

Bytecode has 8 method signatures, docs stub has 7. Missing:

- `List&lt;String&gt; getJunctionIdListNames()`
- `List&lt;Schema.SObjectType&gt; getJunctionReferenceTo()`

### Schema.DescribeFieldResult

Bytecode has 60 method signatures, docs stub has 51. Missing:

- `String getCompoundFieldName()`
- `Boolean getDataTranslationEnabled()`
- `Schema.FilteredLookupInfo getFilteredLookupInfo()`
- `String getMaskType()`
- `String getMask()`
- `List&lt;Schema.SObjectType&gt; getReferenceTo()`
- `Boolean isAggregatable()`
- `Boolean isDisplayLocationInDecimal()`
- `Boolean isHighScaleNumber()`
- `Boolean isQueryByDistance()`

### Schema.DescribeSObjectResult

Bytecode has 36 method signatures, docs stub has 33. Missing:

- `String getAssociateEntityType()`
- `Boolean getHasSubtypes()`
- `Boolean getIsSubtype()`
- `Map&lt;String,Schema.RecordTypeInfo&gt; getRecordTypeInfosByDeveloperName()`

### Schema.DescribeTabResult

Bytecode has 11 method signatures, docs stub has 9. Missing:

- `String getMobileUrl()`
- `String getName()`
- `String getTabEnumOrId()`

### Schema.DescribeTabSetResult

Bytecode has 7 method signatures, docs stub has 7. Missing:

- `String getTabSetId()`

---

## Sfc

**1 missing signature across 1 class**

### Sfc.ContentDownloadHandlerFactory

Bytecode has 1 method signature, docs stub has 0. Missing:

- `Sfc.ContentDownloadHandler getContentDownloadHandler(List&lt;Id&gt;, Sfc.ContentDownloadContext)`

---

## Sfdc_Enablement

**1 missing signature across 1 class**

### Sfdc_Enablement.LearningEvaluation

Bytecode has 5 method signatures, docs stub has 5. Missing:

- `void setDetails(Map&lt;String,ANY&gt;)`

---

## Site

**2 missing signatures across 1 class**

### Site.UrlRewriter

Bytecode has 2 method signatures, docs stub has 0. Missing:

- `List&lt;System.PageReference&gt; generateUrlFor(List&lt;System.PageReference&gt;)`
- `System.PageReference mapRequestUrl(System.PageReference)`

---

## Slack

**60 missing signatures across 9 classes**

### Slack.App

Bytecode has 11 method signatures, docs stub has 7. Missing:

- `static Slack.App getAppByKey(String)`
- `static Slack.App getAppByName(String)`
- `Map&lt;String,String&gt; getConnectedSalesforceUserIdMap(String, List&lt;String&gt;)`
- `Map&lt;String,String&gt; getConnectedSlackUserIdMap(String, List&lt;String&gt;)`

### Slack.BotClient

Bytecode has 92 method signatures, docs stub has 84. Missing:

- `Slack.BookmarksAddResponse bookmarksAdd(Slack.BookmarksAddRequest)`
- `Slack.BookmarksEditResponse bookmarksEdit(Slack.BookmarksEditRequest)`
- `Slack.BookmarksListResponse bookmarksList(Slack.BookmarksListRequest)`
- `Slack.BookmarksRemoveResponse bookmarksRemove(Slack.BookmarksRemoveRequest)`
- `Slack.ConversationsAcceptSharedInviteResponse conversationsAcceptSharedInvite(Slack.ConversationsAcceptSharedInviteRequest)`
- `Slack.ConversationsDeclineSharedInviteResponse conversationsDeclineSharedInvite(Slack.ConversationsDeclineSharedInviteRequest)`
- `Slack.ConversationsInviteSharedResponse conversationsInviteShared(Slack.ConversationsInviteSharedRequest)`
- `Slack.ConversationsListConnectInvitesResponse conversationsListConnectInvites(Slack.ConversationsListConnectInvitesRequest)`

### Slack.Conversation

Bytecode has 103 method signatures, docs stub has 154. Missing:

- `String getContextTeamId()`
- `Long getUpdated()`
- `void setContextTeamId(String)`
- `void setUpdated(Long)`

### Slack.File

Bytecode has 239 method signatures, docs stub has 290. Missing:

- `String getAltTxt()`
- `Integer getDurationMs()`
- `String getFileAccess()`
- `String getHlsEmbed()`
- `String getHls()`
- `Slack.File.MediaProgress getMediaProgress()`
- `String getMp4()`
- `String getSubtype()`
- `Integer getThumbVideoH()`
- `Integer getThumbVideoW()`
- `Slack.File.Transcription getTranscription()`
- `String getUserTeam()`
- `String getVtt()`
- `void setAltTxt(String)`
- `void setDurationMs(Integer)`
- `void setFileAccess(String)`
- `void setHeaders(Slack.File.Headers)`
- `void setHlsEmbed(String)`
- `void setHls(String)`
- `void setMediaProgress(Slack.File.MediaProgress)`
- `void setMp4(String)`
- `void setSimplifiedHtml(String)`
- `void setSubtype(String)`
- `void setThumbVideoH(Integer)`
- `void setThumbVideoW(Integer)`
- `void setTranscription(Slack.File.Transcription)`
- `void setUserTeam(String)`
- `void setVtt(String)`

### Slack.Message

Bytecode has 93 method signatures, docs stub has 154. Missing:

- `String getAppId()`
- `Slack.Message.Metadata getMetadata()`
- `Boolean isLocked()`
- `void setAppId(String)`
- `void setMetadata(Slack.Message.Metadata)`

### Slack.RequestContext

Bytecode has 14 method signatures, docs stub has 22. Missing:

- `Slack.App getApp()`
- `Slack.UserType getUserType()`
- `Boolean isDefaultOrg()`

### Slack.Team

Bytecode has 27 method signatures, docs stub has 135. Missing:

- `String getAvatarBaseUrl()`
- `void setAvatarBaseUrl(String)`

### Slack.User

Bytecode has 59 method signatures, docs stub has 177. Missing:

- `String getWhoCanShareContactCard()`

### Slack.UserClient

Bytecode has 104 method signatures, docs stub has 101. Missing:

- `Slack.BookmarksAddResponse bookmarksAdd(Slack.BookmarksAddRequest)`
- `Slack.BookmarksEditResponse bookmarksEdit(Slack.BookmarksEditRequest)`
- `Slack.BookmarksListResponse bookmarksList(Slack.BookmarksListRequest)`
- `Slack.BookmarksRemoveResponse bookmarksRemove(Slack.BookmarksRemoveRequest)`
- `Slack.ConversationsLeaveResponse conversationsLeave(Slack.ConversationsLeaveRequest)`

---

## Support

**2 missing signatures across 2 classes**

### Support.EmailTemplateSelector

Bytecode has 1 method signature, docs stub has 0. Missing:

- `Id getDefaultEmailTemplateId(Id)`

### Support.MilestoneTriggerTimeCalculator

Bytecode has 1 method signature, docs stub has 0. Missing:

- `Integer calculateMilestoneTriggerTime(String, String)`

---

## System

**114 missing signatures across 39 classes**

### System.Callable

Bytecode has 1 method signature, docs stub has 0. Missing:

- `Object call(String, Map&lt;String,ANY&gt;)`

### System.Cases

Bytecode has 5 method signatures, docs stub has 1. Missing:

- `static String generateThreadingMessageId(Id)`
- `static Id getCaseIdFromEmailHeaders(List&lt;Messaging.InboundEmail.Header&gt;)`
- `static Id getCaseIdFromEmailThreadId(String)`
- `static Boolean reparentFeedToCaseId(Id, Id, Id)`

### System.Comparable

Bytecode has 1 method signature, docs stub has 0. Missing:

- `Integer compareTo(Object)`

### System.Comparator

Bytecode has 1 method signature, docs stub has 0. Missing:

- `Integer compare(Object, Object)`

### System.Crypto

Bytecode has 18 method signatures, docs stub has 17. Missing:

- `static Blob generateAesKey(Integer)`

### System.Database

Bytecode has 64 method signatures, docs stub has 57. Missing:

- `static Database.LeadConvertResult convertLead(Database.LeadConvert)`
- `static List&lt;SObject&gt; countQueryWithBinds(String, Map, Object)`
- `static Database.DeleteResult delete(Id)`
- `static Database.QueryLocator getQueryLocatorWithBinds(String, Map, Object)`
- `static List&lt;Database.SaveResult&gt; insert(List&lt;SObject&gt;)`
- `static List&lt;SObject&gt; queryWithBinds(String, Map, Object)`
- `static List&lt;Database.NestedSaveResult&gt; treeSave(List&lt;SObject&gt;)`
- `static Database.UndeleteResult undelete(Id)`
- `static List&lt;Database.SaveResult&gt; update(List&lt;SObject&gt;)`
- `static List&lt;Database.UpsertResult&gt; upsert(List&lt;SObject&gt;)`
- `static List&lt;Database.UpsertResult&gt; upsert(List&lt;SObject&gt;, Object)`

### System.DmlException

Bytecode has 8 method signatures, docs stub has 1. Missing:

- `List&lt;String&gt; getDmlFieldNames(Integer)`
- `List&lt;Schema.SObjectField&gt; getDmlFields(Integer)`
- `String getDmlId(Integer)`
- `Integer getDmlIndex(Integer)`
- `String getDmlMessage(Integer)`
- `String getDmlStatusCode(Integer)`
- `System.StatusCode getDmlType(Integer)`
- `Integer getNumDml()`

### System.EmailException

Bytecode has 8 method signatures, docs stub has 1. Missing:

- `List&lt;String&gt; getDmlFieldNames(Integer)`
- `List&lt;Schema.SObjectField&gt; getDmlFields(Integer)`
- `String getDmlId(Integer)`
- `Integer getDmlIndex(Integer)`
- `String getDmlMessage(Integer)`
- `String getDmlStatusCode(Integer)`
- `System.StatusCode getDmlType(Integer)`
- `Integer getNumDml()`

### System.EmailMessages

Bytecode has 3 method signatures, docs stub has 1. Missing:

- `static String getFormattedThreadingToken(Id)`
- `static Id getRecordIdFromEmail(String, String, String)`

### System.ExternalServiceTest

Bytecode has 2 method signatures, docs stub has 1. Missing:

- `System.HttpResponse sendCallback(System.HttpRequest)`

### System.Finalizer

Bytecode has 1 method signature, docs stub has 0. Missing:

- `void execute(System.FinalizerContext)`

### System.FinalizerContext

Bytecode has 4 method signatures, docs stub has 0. Missing:

- `Id getAsyncApexJobId()`
- `Exception getException()`
- `String getRequestId()`
- `System.ParentJobResult getResult()`

### System.HttpCalloutMock

Bytecode has 1 method signature, docs stub has 0. Missing:

- `System.HttpResponse respond(System.HttpRequest)`

### System.InstallHandler

Bytecode has 1 method signature, docs stub has 0. Missing:

- `void onInstall(System.InstallContext)`

### System.Limits

Bytecode has 64 method signatures, docs stub has 52. Missing:

- `static Integer getDatabaseTime()`
- `static Integer getFieldsDescribes()`
- `static Integer getFieldSetsDescribes()`
- `static Integer getLimitChildRelationshipsDescribes()`
- `static Integer getLimitDatabaseTime()`
- `static Integer getLimitFieldsDescribes()`
- `static Integer getLimitFieldSetsDescribes()`
- `static Integer getLimitPicklistDescribes()`
- `static Integer getLimitRecordTypesDescribes()`
- `static Integer getLimitScriptStatements()`
- `static Integer getPicklistDescribes()`
- `static Integer getRecordTypesDescribes()`
- `static Integer getScriptStatements()`

### System.Matcher

Bytecode has 28 method signatures, docs stub has 22. Missing:

- `System.Pattern pattern()`
- `System.Matcher region(Integer, Integer)`
- `System.Matcher reset()`
- `System.Matcher useAnchoringBounds(Boolean)`
- `System.Matcher usePattern(System.Pattern)`
- `System.Matcher useTransparentBounds(Boolean)`

### System.Messaging

Bytecode has 11 method signatures, docs stub has 10. Missing:

- `static List&lt;Messaging.SendEmailResult&gt; sendEmailMessage(List&lt;Id&gt;)`
- `static List&lt;Messaging.SendEmailResult&gt; sendEmail(List&lt;Messaging.Email&gt;)`

### System.MultiStaticResourceCalloutMock

Bytecode has 6 method signatures, docs stub has 5. Missing:

- `System.HttpResponse respond(System.HttpRequest)`

### System.Network

Bytecode has 13 method signatures, docs stub has 11. Missing:

- `static System.PageReference forwardToAuthPage(String, String)`
- `static Integer loadAllPackageDefaultNetworkWorkspaceMetricSettings()`

### System.Queueable

Bytecode has 1 method signature, docs stub has 0. Missing:

- `void execute(System.QueueableContext)`

### System.QueueableContext

Bytecode has 1 method signature, docs stub has 0. Missing:

- `Id getJobId()`

### System.QueueableDuplicateSignature

Bytecode has 2 method signatures, docs stub has 8. Missing:

- `static System.QueueableDuplicateSignature.Builder builder()`

### System.QuickAction

Bytecode has 8 method signatures, docs stub has 7. Missing:

- `static List&lt;QuickAction.QuickActionTemplateResult&gt; retrieveQuickActionTemplates(List&lt;String&gt;, Id)`
- `static QuickAction.QuickActionTemplateResult retrieveQuickActionTemplate(String, Id)`

### System.RemoteObjectController

Bytecode has 5 method signatures, docs stub has 5. Missing:

- `static Map&lt;String,ANY&gt; create(String, Map&lt;String,ANY&gt;)`
- `static Map&lt;String,ANY&gt; retrieve(String, List&lt;String&gt;, Map&lt;String,ANY&gt;)`
- `static Map&lt;String,ANY&gt; updat(String, List&lt;String&gt;, Map&lt;String,ANY&gt;)`

### System.SandboxPostCopy

Bytecode has 1 method signature, docs stub has 0. Missing:

- `void runApexClass(System.SandboxContext)`

### System.Schedulable

Bytecode has 1 method signature, docs stub has 0. Missing:

- `void execute(System.SchedulableContext)`

### System.SchedulableContext

Bytecode has 1 method signature, docs stub has 0. Missing:

- `Id getTriggerId()`

### System.Schema

Bytecode has 9 method signatures, docs stub has 6. Missing:

- `static Map&lt;String,Schema.SObjectType&gt; getAppDescribe(String)`
- `static Map&lt;String,Schema.SObjectType&gt; getGlobalDescribe()`
- `static Map&lt;String,Schema.SObjectType&gt; getModuleDescribe()`
- `static Map&lt;String,Schema.SObjectType&gt; getModuleDescribe(String)`

### System.Security

Bytecode has 4 method signatures, docs stub has 3. Missing:

- `static System.SObjectAccessDecision stripInaccessible(System.AccessType, List&lt;SObject&gt;, Boolean, Id)`

### System.Site

Bytecode has 46 method signatures, docs stub has 39. Missing:

- `static System.PageReference changePassword(String, String)`
- `static Id createPortalUser(SObject, String)`
- `static Id createPortalUser(SObject, String, String)`
- `static Boolean forgotPassword(String, String)`
- `static String getCurrentSiteUrl()`
- `static String getCustomWebAddress()`
- `static String getPrefix()`

### System.SoqlStubProvider

Bytecode has 2 method signatures, docs stub has 2. Missing:

- `List&lt;SObject&gt; handleSoqlQuery(Schema.SObjectType, String, Map&lt;String,ANY&gt;)`

### System.StaticResourceCalloutMock

Bytecode has 6 method signatures, docs stub has 5. Missing:

- `System.HttpResponse respond(System.HttpRequest)`

### System.StubProvider

Bytecode has 1 method signature, docs stub has 0. Missing:

- `Object handleMethodCall(Object, String, System.Type, List&lt;System.Type&gt;, List&lt;String&gt;, List&lt;ANY&gt;)`

### System.System

Bytecode has 43 method signatures, docs stub has 39. Missing:

- `static void assertEquals(Object, Object)`
- `static void assertNotEquals(Object, Object)`
- `static void assert(Boolean)`
- `static void changeOwnPassword(String, String)`
- `static void runAs(SObject, Object)`

### System.Test

Bytecode has 36 method signatures, docs stub has 30. Missing:

- `static List&lt;SObject&gt; createStubQueryRows(Schema.SObjectType, List&lt;Map&lt;String,ANY&gt;&gt;)`
- `static SObject createStubQueryRow(Schema.SObjectType, Map&lt;String,ANY&gt;)`
- `static System.ExternalServiceTest getExternalService()`
- `static Component.apex.page invokePage(System.PageReference)`
- `static void testInstall(System.InstallHandler, System.Version)`
- `static void testInstall(System.InstallHandler, System.Version, Boolean, Boolean)`
- `static Messaging.ActionResult testNotificationActionHandler(Messaging.NotificationActionHandler, Messaging.ActionableNotification)`
- `static void testUninstall(System.UninstallHandler, Boolean)`

### System.UninstallHandler

Bytecode has 1 method signature, docs stub has 0. Missing:

- `void onUninstall(System.UninstallContext)`

### System.UserManagement

Bytecode has 16 method signatures, docs stub has 16. Missing:

- `static String initVerificationMethod(Auth.VerificationMethod, String, Map&lt;String,String&gt;)`

### System.WebServiceCallout

Bytecode has 3 method signatures, docs stub has 2. Missing:

- `static Object beginInvoke(Object, Object, Object, Object, List)`
- `static Object endInvoke(Object)`
- `static void invoke(Object, Object, Map, List)`

### System.WebServiceMock

Bytecode has 1 method signature, docs stub has 0. Missing:

- `void doInvoke(Object, Object, Map&lt;String,ANY&gt;, String, String, String, String, String, String)`

---

## TerritoryMgmt

**1 missing signature across 1 class**

### TerritoryMgmt.OpportunityTerritory2AssignmentFilter

Bytecode has 1 method signature, docs stub has 0. Missing:

- `Map&lt;Id,Id&gt; getOpportunityTerritory2Assignments(List&lt;Id&gt;)`

---

## TxnSecurity

**2 missing signatures across 2 classes**

### TxnSecurity.EventCondition

Bytecode has 1 method signature, docs stub has 0. Missing:

- `Boolean evaluate(SObject)`

### TxnSecurity.PolicyCondition

Bytecode has 1 method signature, docs stub has 0. Missing:

- `Boolean evaluate(TxnSecurity.Event)`

---

## VisualEditor

**1 missing signature across 1 class**

### VisualEditor.DynamicPickList

Bytecode has 6 method signatures, docs stub has 5. Missing:

- `VisualEditor.DynamicPickListRows getValuesForSemanticSearch(String)`

---

## Wave

**6 missing signatures across 2 classes**

### Wave.ProjectionNode

Bytecode has 9 method signatures, docs stub has 8. Missing:

- `String build()`

### Wave.Templates

Bytecode has 10 method signatures, docs stub has 5. Missing:

- `static Map&lt;String,ANY&gt; cdpQueryMetadata(String, String, String, String)`
- `static List&lt;Map&lt;String,ANY&gt;&gt; getSObjects()`
- `static Map&lt;String,ANY&gt; getSObject(String)`
- `static Map&lt;String,ANY&gt; getTemplateConfig(String, String, Boolean, String)`
- `static Map&lt;String,ANY&gt; getTemplate(String, String, String)`

---

## sfdc_surveys

**1 missing signature across 1 class**

### sfdc_surveys.SurveyInvitationLinkShortener

Bytecode has 1 method signature, docs stub has 0. Missing:

- `String getShortenedURL(String)`

---
