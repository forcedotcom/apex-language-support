/**
 * Contains static methods to expose extension-related context information.
 * <p>Example
 *         // The Sample Extension Provider registered with developer name as
 *         // 'tax_extension_provider_for_us' will be selected for execution for en_US locale
 *         if(CommerceExtension.ExtensionInfo.getLocaleString() == 'en_US') {
 *             return new CommerceExtension.Resolution('tax_extension_provider_for_us');
 *         }
 *         // The Sample Extension Provider registered with developer name as
 *         // 'tax_extension_provider_for_canada' will be selected for execution for en_CA locale
 *         if(CommerceExtension.ExtensionInfo.getLocaleString() == 'en_CA') {
 *             return new CommerceExtension.Resolution('tax_extension_provider_for_canada');
 *         }
 *         // The default Salesforce Internal Tax Api will return an empty response for German locale
 *         if(CommerceExtension.ExtensionInfo.getLocaleString() == 'de') {
 *             return new CommerceExtension.Resolution(CommerceExtension.ResolutionStates.OFF);
 *         }
 */
global class ExtensionInfo {
    global ExtensionInfo() { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the version number of the Client API for the extension context.
     * @return Version number of the Client API for the extension context.
     */
    global static Double getClientApiVersion() { return 0.0; }

    /**
     * Returns a custom parameter field value, if available, for the extension context.
     * @return Custom parameter field value for the extension context.
     */
    global static String getCustomParameterField(String fieldName) { return null; }

    /**
     * Returns the locale for the extension context.
     * @return Locale for the extension context.
     */
    global static String getLocaleString() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Indicates whether custom parameters are available for the extension context.
     * @return Value indicating if custom parameters are available in the extension context (true) or not (false).
     */
    global static Boolean isCustomParametersAvailable() { return false; }

    global override virtual String toString() { return null; }
}