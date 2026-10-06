/**
 * Use this interface to retrieve environment context information, such as the app display location or the configuration parameters.
 * Usage
 * The EnvironmentContext interface provides methods to retrieve environment information about the current canvas app. For this interface, you don’t need to create an implementation. Use the default implementation that Salesforce provides.
 */
global interface EnvironmentContext {
    /**
     * Adds a field to the list of object fields that are returned in the signed request Record object when the component appears on a Visualforce page that’s placed on an object.
     * Usage
     * When you use the <apex:canvasApp> component to display a canvas app on a Visualforce page, and that page is associated with an object (placed on the page layout, for example), you can specify fields to be returned from the related object. See the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.platform_connect.meta/platform_connect/" target="_blank" title="HTML (New Window)">Canvas Developer Guide</a> for more information on the Record object.
     * Use addEntityField() to add a field to the list of object fields that are returned in the signed request Record object. By default the list of fields includes ID. You can add fields by name or add all fields that the user has permission to view by calling addEntityField('*').
     * You can inspect the configured list of fields by using Canvas.EnvironmentContext.getEntityFields().
     * Example
     * This example adds the Name and BillingAddress fields to the list of object fields. This example assumes the canvas app will appear in a Visualforce page that's associated with the Account page layout.
     * Canvas.EnvironmentContext env = renderContext.getEnvironmentContext();
     *
     * // Add Name and BillingAddress to fields (assumes we'll run from the Account detail page)
     * env.addEntityField('Name');
     * env.addEntityField('BillingAddress');
     */
    abstract void addEntityField(String entityFieldName);

    /**
     * Adds a set of fields to the list of object fields that are returned in the signed request Record object when the component appears on a Visualforce page that’s placed on an object.
     * Usage
     * When you use the <apex:canvasApp> component to display a canvas app on a Visualforce page, and that page is associated with an object (placed on the page layout, for example), you can specify fields to be returned from the related object. See the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.platform_connect.meta/platform_connect/" target="_blank" title="HTML (New Window)">Canvas Developer Guide</a> for more information on the Record object.
     * Use addEntityFields() to add a set of one or more fields to the list of object fields that are returned in the signed request Record object. By default the list of fields includes ID. You can add fields by name or add all fields that the user has permission to view by adding a set that includes ‘*’ as one of the strings.
     * You can inspect the configured list of fields by using Canvas.EnvironmentContext.getEntityFields().
     * Example
     * This example adds the Name, BillingAddress, and YearStarted fields to the list of object fields. This example assumes that the canvas app will appear in a Visualforce page that’s associated with the Account page layout.
     * Canvas.EnvironmentContext env = renderContext.getEnvironmentContext();
     *
     * // Add Name, BillingAddress and YearStarted to fields (assumes we'll run from the Account detail page)
     * Set<String> fields = new Set<String>{'Name','BillingAddress','YearStarted'};
     * env.addEntityFields(fields);
     */
    abstract void addEntityFields(Set entityFieldNames);

    virtual Boolean equals(Object arg0);

    /**
     * Retrieves the display location where the canvas app is being called from. For example, a value of Visualforce page.
     * Usage
     * Use this method to obtain the display location for the canvas app.
     * @return The return value can be one of the following strings:
     * Chatter—The canvas app was called from the Chatter tab.
     * ChatterFeed—The canvas app was called from a Chatter canvas feed item.
     * MobileNav—The canvas app was called from the navigation menu.
     * OpenCTI—The canvas app was called from an Open CTI component.
     * PageLayout—The canvas app was called from an element within a page layout. If the displayLocation is PageLayout, one of the subLocation values might be returned.
     * Publisher—The canvas app was called from a canvas custom quick action.
     * ServiceDesk—The canvas app was called from a Salesforce Console component.
     * Visualforce—The canvas app was called from a Visualforce page.
     * None—The canvas app was called from the Canvas App Previewer.
     */
    abstract String getDisplayLocation();

    /**
     * Retrieves the list of object fields that are returned in the signed request Record object when the component appears on a Visualforce page that’s placed on an object.
     * Usage
     * When you use the <apex:canvasApp> component to display a canvas app on a Visualforce page, and that page is associated with an object (placed on the page layout, for example), you can specify fields to be returned from the related object. See the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.platform_connect.meta/platform_connect/" target="_blank" title="HTML (New Window)">Canvas Developer Guide</a> for more information on the Record object.
     * Use getEntityFields() to retrieve the list of object fields that are returned in the signed request Record object. By default the list of fields includes ID. The list of fields can be configured by using the Canvas.EnvironmentContext.addEntityField(fieldName) or Canvas.EnvironmentContext.addEntityFields(fieldNames) methods.
     * Example
     * This example gets the current list of object fields and retrieves each item in the list, printing each field name to the debug log.
     * Canvas.EnvironmentContext env = renderContext.getEnvironmentContext();
     *
     * List<String> entityFields = env.getEntityFields();
     * for (String fieldVal : entityFields) {
     *     System.debug('Environment Context entityField: ' + fieldVal);
     * }
     * If the canvas app that’s using this lifecycle code was run from the detail page of an Account, the debug log output might look like:
     * Environment Context entityField: Id
     */
    abstract List getEntityFields();

    /**
     * Retrieves the location URL of the canvas app.
     * Usage
     * Use this method to obtain the URL of the page where the user accessed the canvas app. For example, if the user accessed your app by clicking a link on the Chatter tab, this method returns the URL of the Chatter tab, which would be similar to ‘https://MyDomainName.my.salesforce.com/_ui/core/chatter/ui/ChatterPage’.
     */
    abstract String getLocationUrl();

    /**
     * Retrieves the current custom parameters for the canvas app. Parameters are returned as a JSON string.
     * Usage
     * Use this method to get the current custom parameters for the canvas app. The parameters are returned in a JSON string that can be de-serialized by using the System.JSON.deserializeUntyped(jsonString) method.
     * Custom parameters can be modified by using the Canvas.EnvironmentContext.setParametersAsJSON(jsonString) string.
     * Example
     * This example gets the current custom parameters, de-serializes them into a map, and prints the results to the debug log.
     * Canvas.EnvironmentContext env = renderContext.getEnvironmentContext();
     *
     * // Get current custom params
     * Map<String, Object> currentParams =
     *     (Map<String, Object>) JSON.deserializeUntyped(env.getParametersAsJSON());
     * System.debug('Environment Context custom paramters: ' + currentParams);
     */
    abstract String getParametersAsJSON();

    /**
     * Retrieves the display sublocation where the canvas app is being called from.
     * Usage
     * Use this method to obtain the display sublocation for the canvas app. Use only if the primary display location can be displayed on mobile devices.
     * @return The return value can be one of the following strings:
     * S1MobileCardFullview—The canvas app was called from a mobile card.
     * S1MobileCardPreview—The canvas app was called from a mobile card preview. The user must click the preview to open the app.
     * S1RecordHomePreview—The canvas app was called from a record detail page preview.  The user must click the preview to open the app.
     * S1RecordHomeFullview—The canvas app was called from a page layout.
     */
    abstract String getSublocation();

    virtual Integer hashCode();

    /**
     * Sets the custom parameters for the canvas app.
     * Usage
     * Use this method to set the current custom parameters for the canvas app. The parameters must be provided in a JSON string. You can use the System.JSON.serialize(objectToSerialize) method to serialize a map into a JSON string.
     * Setting the custom parameters will overwrite the custom parameters that are set for the current request. If you need to modify the current custom parameters, first get the current set of custom parameters by using getParametersAsJSON(), modify the retrieved parameter set as needed, and then use this modified set in your call to setParametersAsJSON().
     * If the provided JSON string exceeds 32KB, a System.CanvasException will be thrown.
     * Example
     * This example gets the current custom parameters, adds a new newCustomParam parameter with a value of ‘TESTVALUE’, and sets the current custom parameters.
     * Canvas.EnvironmentContext env = renderContext.getEnvironmentContext();
     *
     * // Get current custom params
     * Map<String, Object> previousParams =
     *     (Map<String, Object>) JSON.deserializeUntyped(env.getParametersAsJSON());
     *
     * // Add a new custom param
     * previousParams.put('newCustomParam','TESTVALUE');
     *
     * // Now replace the parameters with the current parameters plus our new custom param
     * env.setParametersAsJSON(JSON.serialize(previousParams));
     */
    abstract void setParametersAsJSON(String jsonString);

    virtual String toString();
}