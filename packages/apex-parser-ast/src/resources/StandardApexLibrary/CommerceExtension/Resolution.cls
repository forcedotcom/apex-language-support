/**
 * Resolution of a resolution strategy, which conditionally invokes default domain logic, logic provided by an extension provider, or no logic.
 */
global class Resolution {

  global Resolution(CommerceExtension.ResolutionStates resolutionState) {}

  global Resolution(String providerName) {}

  global String getProviderName() {}

  global CommerceExtension.ResolutionStates getResolutionState() {}

  global Object clone() {}

}