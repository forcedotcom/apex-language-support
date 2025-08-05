public with sharing class Application {
    // Returns true if Code Builder is GA and is enabled by the org admin and the current user has permission.
    // To enable at org level, an org admin must agree to the terms and conditions in Core Setup UI. This assumes the org has at least one CodeBuilderUserPslAddOn license applied.
    // To give a user permission, an org admin must add the user to the 'Code Builder User' System Permission Set. Each user in the System Permission Set consumes one CodeBuilderUserPslAddOn license.
    // During beta, this always returns true.
    // During development, this can be overridden with CodeBuilderSetting.CodeBuilderEnabledForUserOverride
    // @AuraEnabled(cacheable=true)
    // public static Boolean isCodeBuilderEnabledForUser() {
    //   Boolean overrideValue = ApplicationSettings.isCodeBuilderEnabledForUserOverride();
    //   if (overrideValue != null) {
    //     return overrideValue;
    //   }
  
    //   // WebIDECore is filed-based Apex. See:
    //   // https://sourcegraph.soma.salesforce.com/perforce.soma.salesforce.com/app/main/core@HEAD/-/blob/webide/apex/codebuilder/WebIDECore.apex
    //   Boolean isBeta = !WebIDECore.isCodeBuilderGA();
    //   Boolean isOrgEnabled = WebIDECore.isCodeBuilderEnabled();
    //   Boolean isUserEnabled = WebIDECore.isCodeBuilderUser();
  
    //   return isBeta || (isOrgEnabled && isUserEnabled);
    // }
  
    @AuraEnabled(cacheable=true)
    public static string getAppInsightsKey() {
      return ApplicationSettings.getInsightsKey();
    }
  
    @AuraEnabled(cacheable=true)
    public static string getOrgId() {
      return UserInfo.getOrganizationId();
    }
  
    public static Boolean getSkipCSRFCheckFeature() {
      return FeatureManagement.checkPackageBooleanValue('SkipCSRFCheck');
    }
  
    public static final fflib_Application.SelectorFactory Selector = new fflib_Application.SelectorFactory(
      new Map<SObjectType, Type>{
        Workspace__c.SObjectType => WorkspacesSelector.class,
        SessionData__c.SObjectType => SessionDataSelector.class
      }
    );
  
    public static final fflib_Application.ServiceFactory Service = new Application.ServiceFactory(
      new Map<Type, Type>{
        IWorkspaceService.class => StandardWorkspaceService.class,
        IApiService.class => StandardApiService.class,
        ISessionDataService.class => StandardSessionDataService.class,
        ICryptoService.class => StandardCryptoService.class
      }
    );
  
    // Customised Service factory to support developer overrides via Custom Metadata
    private class ServiceFactory extends fflib_Application.ServiceFactory {
      private class OverrideSettings {
        public String ClassName;
        public String NamespacePrefix;
      }
      private Map<String, String> servicesByClassName = new Map<String, String>();
  
      public ServiceFactory(
        Map<Type, Type> serviceInterfaceTypeByServiceImplType
      ) {
        super(serviceInterfaceTypeByServiceImplType);
  
        // Map of overriden services defined by the developer in this org
        for (ServiceSetting__mdt serviceOverride : [
          SELECT DeveloperName, NamespacePrefix, ApexClass__c
          FROM ServiceSetting__mdt
        ]) {
          servicesByClassName.put(
            serviceOverride.NamespacePrefix +
            '.' +
            serviceOverride.DeveloperName,
            serviceOverride.ApexClass__c
          );
        }
      }
  
      public override Object newInstance(Type serviceInterfaceType) {
        // Has the developer overriden the Service implementation in their org?
        if (
          !Test.isRunningTest() &&
          servicesByClassName.containsKey(serviceInterfaceType.getName())
        ) {
          String overridenServiceImpl = servicesByClassName.get(
            serviceInterfaceType.getName()
          );
          return Type.forName(overridenServiceImpl).newInstance();
        }
  
        // Default Service Factory returns mocked or registered default implementation
        return super.newInstance(serviceInterfaceType);
      }
    }
  
    // Customised Selector factory to support developer overrides via Custom Metadata
    public class SelectorFactory extends fflib_Application.SelectorFactory {
      public SelectorFactory(Map<SObjectType, Type> selectorsBySObjectType) {
        super(selectorsBySObjectType);
      }
  
      public override fflib_ISObjectSelector newInstance(
        SObjectType sObjectType
        ) {
        // Has the developer overriden the Selector for the given SObjectType?
        if (
          !Test.isRunningTest() &&
          selectorsBySObjectType.containsKey(sObjectType)
        ) {
          return (fflib_ISObjectSelector)Type.forName(
            selectorsBySObjectType.get(sObjectType).getName()
          ).newInstance();
        }
  
        // Default Selector Factory returns mocked or registered default implementation
        return super.newInstance(sObjectType);
      }
    }
  
    interface IWorkspaceService {
      Workspace__c getWorkspace(Id workspaceId);
    }
  
    enum WorkspaceType {
      ScratchOrg,
      Sandbox,
      Production
    }
  }
  