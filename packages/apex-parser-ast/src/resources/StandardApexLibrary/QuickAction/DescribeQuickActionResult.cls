/**
 * Contains describe metadata information for a quick action.
 */
public class DescribeQuickActionResult {

  /**
   * Returns the unique ID for the action. If the action doesn’t have an ID, its API name is used.
   * @return String
   */
  public String getActionEnumOrId() {}

  /**
   * Returns an array of color information. Each color is associated with a theme.
   * @return List<Schema.DescribeColorResult>
   */
  public List<Schema.DescribeColorResult> getColors() {}

  /**
   * Returns the object used for the action. Replaces getsourceSobjectType() in API version 30.0 and later.
   * @return String
   */
  public String getContextSobjectType() {}

  /**
   * Returns the default values for a action.
   * @return List<QuickAction.DescribeQuickActionDefaultValue>
   */
  public List<QuickAction.DescribeQuickActionDefaultValue> getDefaultValues() {}

  /**
   * If the custom action invokes a flow, returns the fully qualified name of the flow invoked by the custom action.
   * @return String
   */
  public String getFlowDevName() {}

  /**
   * If the custom action invokes a flow, returns the input variable that the custom action passes the record’s ID to.
   * @return String
   */
  public String getFlowRecordIdVar() {}

  /**
   * Returns the height in pixels of the action pane.
   * @return Integer
   */
  public Integer getHeight() {}

  /**
   * Returns the actions’ icon name.
   * @return String
   */
  public String getIconName() {}

  /**
   * Returns the URL of the 32x32 icon used for the action.
   * @return String
   */
  public String getIconUrl() {}

  /**
   * Returns a list of Schema.DescribeIconResult objects that describe colors used in a tab.
   * @return List<Schema.DescribeIconResult>
   */
  public List<Schema.DescribeIconResult> getIcons() {}

  /**
   * Returns the action label.
   * @return String
   */
  public String getLabel() {}

  /**
   * Returns the layout sections that comprise an action.
   * @return QuickAction.DescribeLayoutSection
   */
  public QuickAction.DescribeLayoutSection getLayout() {}

  /**
   * If the custom action invokes an Aura component, returns the ID of the Aura component bundle to which the component belongs.
   * @return String
   */
  public String getLightningComponentBundleId() {}

  /**
   * If the custom action invokes an Aura component, returns the name of the Aura component bundle to which the component belongs.
   * @return String
   */
  public String getLightningComponentBundleName() {}

  /**
   * If the custom action invokes an Aura component, returns the fully qualified name of the Aura component invoked by the custom action.
   * @return String
   */
  public String getLightningComponentQualifiedName() {}

  /**
   * Returns the 16x16 icon URL.
   * @return String
   */
  public String getMiniIconUrl() {}

  /**
   * Returns the action name.
   * @return String
   */
  public String getName() {}

  /**
   * Returns an indication of whether the Lightning component quick action header and footer are shown.
   * @return Boolean
   */
  public Boolean getShowQuickActionLcHeader() {}

  /**
   * Returns an indication of whether the Visualforce quick action header and footer should be shown.
   * @return Boolean
   */
  public Boolean getShowQuickActionVfHeader() {}

  /**
   * Returns the object type used for the action.
   * @return String
   */
  public String getSourceSobjectType() {}

  /**
   * Returns the parent object’s type for the action.
   * @return String
   */
  public String getTargetParentField() {}

  /**
   * Returns the record type of the targeted record.
   * @return String
   */
  public String getTargetRecordTypeId() {}

  /**
   * Returns the action’s target object type.
   * @return String
   */
  public String getTargetSobjectType() {}

  /**
   * Returns a create or custom Visualforce action.
   * @return String
   */
  public String getType() {}

  /**
   * If Visualforce is used, returns the name of the associated page for the action.
   * @return String
   */
  public String getVisualforcePageName() {}

  /**
   * Returns the URL of the Visualforce page associated with the action.
   * @return String
   */
  public String getVisualforcePageUrl() {}

  /**
   * If a custom action is created, returns the width in pixels of the action pane.
   * @return Integer
   */
  public Integer getWidth() {}

}