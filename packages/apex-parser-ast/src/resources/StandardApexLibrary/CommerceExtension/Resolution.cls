/**
 * Resolution of a resolution strategy, which conditionally invokes default domain logic, logic provided by an extension provider, or no logic.
 */
global class Resolution {

  public Resolution(CommerceExtension.ResolutionStates resolutionState) {}

  public Resolution(String providerName) {}

  public String getProviderName() {}

  public CommerceExtension.ResolutionStates getResolutionState() {}

}