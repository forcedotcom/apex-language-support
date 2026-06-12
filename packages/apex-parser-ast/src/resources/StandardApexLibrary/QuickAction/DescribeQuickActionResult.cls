/**
 * Contains describe metadata information for a quick action.
 */
global class DescribeQuickActionResult {

  global DescribeQuickActionResult() {}

  global String canvasapplicationname;

  global List<Schema.DescribeColorResult> colors;

  global String contextsobjecttype;

  global List<QuickAction.DescribeQuickActionDefaultValue> defaultvalues;

  global String flowdevname;

  global String flowrecordidvar;

  global Integer height;

  global String iconname;

  global List<Schema.DescribeIconResult> icons;

  global String iconurl;

  global QuickAction.DescribeLayoutSection layout;

  global String lightningcomponentbundleid;

  global String lightningcomponentbundlename;

  global String lightningcomponentqualifiedname;

  global String lightningwebcomponentbundleid;

  global String lightningwebcomponentbundlename;

  global String lightningwebcomponentqualifiedname;

  global String miniiconurl;

  global Boolean showquickactionlcheader;

  global Boolean showquickactionvfheader;

  global String targetparentfield;

  global String targetrecordtypeid;

  global String targetsobjecttype;

  global String visualforcepagename;

  global String visualforcepageurl;

  global Integer width;

  /**
   * Returns the unique ID for the action. If the action doesn’t have an ID, its API name is used.
   * @return String
   */
  global String getActionEnumOrId() {}

  /**
   * Returns the name of the Canvas application, if used.
   * @return String
   */
  global String getCanvasApplicationName() {}

  /**
   * Returns an array of color information. Each color is associated with a theme.
   * @return List<Schema.DescribeColorResult>
   */
  global List<Schema.DescribeColorResult> getColors() {}

  /**
   * Returns the object used for the action. Replaces getsourceSobjectType() in API version 30.0 and later.
   * @return String
   */
  global String getContextSobjectType() {}

  /**
   * Returns the default values for a action.
   * @return List<QuickAction.DescribeQuickActionDefaultValue>
   */
  global List<QuickAction.DescribeQuickActionDefaultValue> getDefaultValues() {}

  /**
   * If the custom action invokes a flow, returns the fully qualified name of the flow invoked by the custom action.
   * @return String
   */
  global String getFlowDevName() {}

  /**
   * If the custom action invokes a flow, returns the input variable that the custom action passes the record’s ID to.
   * @return String
   */
  global String getFlowRecordIdVar() {}

  /**
   * Returns the height in pixels of the action pane.
   * @return Integer
   */
  global Integer getHeight() {}

  /**
   * Returns the actions’ icon name.
   * @return String
   */
  global String getIconName() {}

  /**
   * Returns the URL of the 32x32 icon used for the action.
   * @return String
   */
  global String getIconUrl() {}

  /**
   * Returns a list of Schema.DescribeIconResult objects that describe colors used in a tab.
   * @return List<Schema.DescribeIconResult>
   */
  global List<Schema.DescribeIconResult> getIcons() {}

  /**
   * Returns the action label.
   * @return String
   */
  global String getLabel() {}

  /**
   * Returns the layout sections that comprise an action.
   * @return QuickAction.DescribeLayoutSection
   */
  global QuickAction.DescribeLayoutSection getLayout() {}

  /**
   * If the custom action invokes an Aura component, returns the ID of the Aura component bundle to which the component belongs.
   * @return String
   */
  global String getLightningComponentBundleId() {}

  /**
   * If the custom action invokes an Aura component, returns the name of the Aura component bundle to which the component belongs.
   * @return String
   */
  global String getLightningComponentBundleName() {}

  /**
   * If the custom action invokes an Aura component, returns the fully qualified name of the Aura component invoked by the custom action.
   * @return String
   */
  global String getLightningComponentQualifiedName() {}

  global String getLightningWebComponentBundleId() {}

  global String getLightningWebComponentBundleName() {}

  global String getLightningWebComponentQualifiedName() {}

  /**
   * Returns the 16x16 icon URL.
   * @return String
   */
  global String getMiniIconUrl() {}

  /**
   * Returns the action name.
   * @return String
   */
  global String getName() {}

  /**
   * Returns an indication of whether the Lightning component quick action header and footer are shown.
   * @return Boolean
   */
  global Boolean getShowQuickActionLcHeader() {}

  /**
   * Returns an indication of whether the Visualforce quick action header and footer should be shown.
   * @return Boolean
   */
  global Boolean getShowQuickActionVfHeader() {}

  /**
   * Returns the object type used for the action.
   * @return String
   */
  global String getSourceSobjectType() {}

  /**
   * Returns the parent object’s type for the action.
   * @return String
   */
  global String getTargetParentField() {}

  /**
   * Returns the record type of the targeted record.
   * @return String
   */
  global String getTargetRecordTypeId() {}

  /**
   * Returns the action’s target object type.
   * @return String
   */
  global String getTargetSobjectType() {}

  /**
   * Returns a create or custom Visualforce action.
   * @return String
   */
  global String getType() {}

  /**
   * If Visualforce is used, returns the name of the associated page for the action.
   * @return String
   */
  global String getVisualforcePageName() {}

  /**
   * Returns the URL of the Visualforce page associated with the action.
   * @return String
   */
  global String getVisualforcePageUrl() {}

  /**
   * If a custom action is created, returns the width in pixels of the action pane.
   * @return Integer
   */
  global Integer getWidth() {}

  global String getAccessLevelRequired() {}

  global String getCanvasApplicationId() {}

  global String getMobileExtensionId() {}

  global List<QuickAction.DescribeQuickActionParameter> getParameters() {}

  global Object clone() {}

}