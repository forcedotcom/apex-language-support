/**
 * Contains describe metadata information for a quick action.
 * <p>Usage
 * The QuickAction describeQuickActions method returns an array of quick action describe result objects (QuickAction.DescribeQuickActionResult).
 */
global class DescribeQuickActionResult extends QuickAction.DescribeAvailableQuickActionResult {
    global String accesslevelrequired { get; }
    global String canvasapplicationid { get; }
    /**
     * The name of the Canvas application invoked by the custom action.
     * <p>String
     */
    global String canvasapplicationname { get; }
    /**
     * Array of color information. Each color is associated with a theme.
     * <p>List<Schema.DescribeColorResult>
     */
    global List colors { get; }
    /**
     * The object used for the action. Was getsourceSobjectType() in API version 29.0 and earlier.
     * <p>String
     */
    global String contextsobjecttype { get; }
    /**
     * The action’s default values.
     * <p>List<QuickAction.DescribeQuickActionDefaultValue>
     */
    global List defaultvalues { get; }
    /**
     * If the custom action invokes a flow, the fully qualified name of the flow.
     * <p>String
     */
    global String flowdevname { get; }
    global String flowrecordidsvar { get; }
    /**
     * If the custom action invokes a flow, the input variable that the custom action passes the record’s ID to.
     * <p>String
     * Valid values are null or recordId.
     */
    global String flowrecordidvar { get; }
    /**
     * The height in pixels of the action pane.
     * <p>Integer
     */
    global Integer height { get; }
    /**
     * The name of the icon used for the action. If a custom icon is not used, this value isn’t set.
     * <p>String
     */
    global String iconname { get; }
    /**
     * Array of icons. Each icon is associated with a theme.
     * <p>List<Schema.DescribeIconResult>
     * If no custom icon was associated with the quick action and the quick action creates a specific object, the icons will correspond to the icons used for the created object. For example, if the quick action creates an Account, the icon array will contain the icons used for Account.
     * If a custom icon was associated with the quick action, the array will contain that custom icon.
     */
    global List icons { get; }
    /**
     * The URL of the icon used for the action. This icon URL corresponds to the 32x32 icon used for the current Salesforce theme, introduced in Spring ’10, or the custom icon, if there is one.
     * <p>String
     */
    global String iconurl { get; }
    /**
     * The section of the layout where the action resides.
     * <p>QuickAction.DescribeLayoutSection
     */
    global QuickAction.DescribeLayoutSection layout { get; }
    /**
     * If the custom action invokes an Aura component, the ID of the Aura component bundle to which the component belongs.
     * <p>String
     */
    global String lightningcomponentbundleid { get; }
    /**
     * If the custom action invokes an Aura component, the name of the Aura component bundle to which the component belongs.
     * <p>String
     */
    global String lightningcomponentbundlename { get; }
    /**
     * The fully qualified name of the Aura component invoked by the custom action.
     * <p>String
     */
    global String lightningcomponentqualifiedname { get; }
    /**
     * If the custom action invokes a Lightning web component, the ID of the Lightning web component bundle to which the component belongs.
     * <p>String
     */
    global String lightningwebcomponentbundleid { get; }
    /**
     * If the custom action invokes a Lightning web component, the name of the Lightning web component bundle to which the component belongs.
     * <p>String
     */
    global String lightningwebcomponentbundlename { get; }
    /**
     * The fully qualified name of the Lightning web component invoked by the custom action.
     * <p>String
     */
    global String lightningwebcomponentqualifiedname { get; }
    /**
     * The icon’s URL. This icon URL corresponds to the 16x16 icon used for the current Salesforce theme, introduced in Spring ’10, or the custom icon, if there is one.
     * <p>String
     */
    global String miniiconurl { get; }
    global String mobileextensionid { get; }
    global List parameters { get; }
    /**
     * Indicates whether the Lightning component quick action header and footer are shown. If false, then both the header containing the quick action title and the footer containing the Save and Cancel buttons aren’t displayed.
     * <p>Boolean
     */
    global Boolean showquickactionlcheader { get; }
    /**
     * Indicates whether the Visualforce quick action header and footer should be shown. If false, then both the header containing the quick action title and the footer containing the Save and Cancel buttons aren’t displayed.
     * <p>Boolean
     */
    global Boolean showquickactionvfheader { get; }
    /**
     * The parent object type of the action. Links the target object to the parent object. For example, the value is Account if the target object is Contact and the parent object is Account.
     * <p>String
     */
    global String targetparentfield { get; }
    /**
     * The record type of the target record.
     * <p>String
     */
    global String targetrecordtypeid { get; }
    /**
     * The action’s target object type.
     * <p>String
     */
    global String targetsobjecttype { get; }
    /**
     * The name of the Visualforce page associated with the custom action.
     * <p>String
     */
    global String visualforcepagename { get; }
    /**
     * The URL of the Visualforce page associated with the action.
     * <p>String
     */
    global String visualforcepageurl { get; }
    /**
     * The width in pixels of the action pane, for custom actions that call Visualforce pages, Canvas apps, or Lightning components.
     * <p>Integer
     */
    global Integer width { get; }

    global Boolean equals(Object obj) { return false; }

    global String getAccessLevelRequired() { return null; }

    /**
     * Returns the unique ID for the action. If the action doesn’t have an ID, its API name is used.
     */
    global String getActionEnumOrId() { return null; }

    global String getCanvasApplicationId() { return null; }

    /**
     * Returns the name of the Canvas application, if used.
     */
    global String getCanvasApplicationName() { return null; }

    /**
     * Returns an array of color information. Each color is associated with a theme.
     */
    global List getColors() { return null; }

    /**
     * Returns the object used for the action. Replaces getsourceSobjectType() in API version 30.0 and later.
     */
    global String getContextSobjectType() { return null; }

    /**
     * Returns the default values for a action.
     */
    global List getDefaultValues() { return null; }

    /**
     * If the custom action invokes a flow, returns the fully qualified name of the flow invoked by the custom action.
     */
    global String getFlowDevName() { return null; }

    /**
     * If the custom action invokes a flow, returns the input variable that the custom action passes the record’s ID to.
     */
    global String getFlowRecordIdVar() { return null; }

    global String getFlowRecordIdsVar() { return null; }

    /**
     * Returns the height in pixels of the action pane.
     */
    global Integer getHeight() { return 0; }

    /**
     * Returns the actions’ icon name.
     */
    global String getIconName() { return null; }

    /**
     * Returns the URL of the 32x32 icon used for the action.
     */
    global String getIconUrl() { return null; }

    /**
     * Returns a list of Schema.DescribeIconResult objects that describe colors used in a tab.
     */
    global List getIcons() { return null; }

    /**
     * Returns the action label.
     */
    global String getLabel() { return null; }

    /**
     * Returns the layout sections that comprise an action.
     */
    global QuickAction.DescribeLayoutSection getLayout() { return null; }

    /**
     * If the custom action invokes an Aura component, returns the ID of the Aura component bundle to which the component belongs.
     */
    global String getLightningComponentBundleId() { return null; }

    /**
     * If the custom action invokes an Aura component, returns the name of the Aura component bundle to which the component belongs.
     */
    global String getLightningComponentBundleName() { return null; }

    /**
     * If the custom action invokes an Aura component, returns the fully qualified name of the Aura component invoked by the custom action.
     */
    global String getLightningComponentQualifiedName() { return null; }

    /**
     * If the custom action invokes a Lightning web component, returns the ID of the Lightning web component bundle to which the component belongs.
     */
    global String getLightningWebComponentBundleId() { return null; }

    /**
     * If the custom action invokes a Lightning web component, returns the name of the Lightning web component bundle to which the component belongs.
     */
    global String getLightningWebComponentBundleName() { return null; }

    /**
     * If the custom action invokes a Lightning web component, returns the fully qualified name of the Lightning web component invoked by the custom action.
     */
    global String getLightningWebComponentQualifiedName() { return null; }

    /**
     * Returns the 16x16 icon URL.
     */
    global String getMiniIconUrl() { return null; }

    global String getMobileExtensionId() { return null; }

    /**
     * Returns the action name.
     */
    global String getName() { return null; }

    global List getParameters() { return null; }

    /**
     * Returns an indication of whether the Lightning component quick action header and footer are shown.
     * @return If false, then both the header containing the quick action title and the footer containing the Save and Cancel buttons aren’t displayed.
     */
    global Boolean getShowQuickActionLcHeader() { return false; }

    /**
     * Returns an indication of whether the Visualforce quick action header and footer should be shown.
     * @return If false, then both the header containing the quick action title and the footer containing the Save and Cancel buttons aren’t displayed.
     */
    global Boolean getShowQuickActionVfHeader() { return false; }

    /**
     * Returns the parent object’s type for the action.
     */
    global String getTargetParentField() { return null; }

    /**
     * Returns the record type of the targeted record.
     */
    global String getTargetRecordTypeId() { return null; }

    /**
     * Returns the action’s target object type.
     */
    global String getTargetSobjectType() { return null; }

    /**
     * Returns a create or custom Visualforce action.
     */
    global String getType() { return null; }

    /**
     * If Visualforce is used, returns the name of the associated page for the action.
     */
    global String getVisualforcePageName() { return null; }

    /**
     * Returns the URL of the Visualforce page associated with the action.
     */
    global String getVisualforcePageUrl() { return null; }

    /**
     * If a custom action is created, returns the width in pixels of the action pane.
     */
    global Integer getWidth() { return 0; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}