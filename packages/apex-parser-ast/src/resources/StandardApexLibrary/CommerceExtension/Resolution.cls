/**
 * Resolution of a resolution strategy, which conditionally invokes default domain logic, logic provided by an extension provider, or no logic.
 * <p>Example
 * public class TaxServiceExtensionResolverSample extends commercestoretax.TaxService implements CommerceExtension.ResolutionStrategy {
 *     public CommerceExtension.Resolution resolve() {
 *         // The Sample Extension Provider registered with developer name as 'tax_extension_provider_for_us' will be selected for execution for en_US locale
 *         if(CommerceExtension.ExtensionInfo.getLocaleString() == 'en_US') {
 *             return new CommerceExtension.Resolution('tax_extension_provider_for_us');
 *         }
 *         // The Sample Extension Provider registered with developer name as 'tax_extension_provider_for_canada' will be selected for execution for en_CA locale
 *         if(CommerceExtension.ExtensionInfo.getLocaleString() == 'en_CA') {
 *             return new CommerceExtension.Resolution('tax_extension_provider_for_canada');
 *         }
 *         // The default Salesforce Internal Tax Api will return an empty response for German locale
 *         if(CommerceExtension.ExtensionInfo.getLocaleString() == 'de') {
 *             return new CommerceExtension.Resolution(CommerceExtension.ResolutionStates.OFF);
 *         }
 *         // The default Salesforce Internal Tax Api will be selected for execution for all other locales than US, Canada and Germany
 *         return new CommerceExtension.Resolution();
 *     }
 * }
 */
global class Resolution {
    /**
     * Default constructor for the Resolution class.
     */
    global Resolution() { }

    /**
     * Constructor that takes the name of an extension provider as an argument.
     */
    global Resolution(String providerName) { }

    /**
     * Constructor that takes a CommerceExtension.ResolutionStates object as an argument.
     */
    global Resolution(CommerceExtension.ResolutionStates resolutionState) { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the name of an extension provider.
     * @return Name of an extension provider.
     */
    global String getProviderName() { return null; }

    /**
     * Returns the resolution state of the resolution.
     * @return Resolution state of the resolution.
     */
    global CommerceExtension.ResolutionStates getResolutionState() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}