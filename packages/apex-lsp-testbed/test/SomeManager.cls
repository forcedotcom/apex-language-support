public with sharing class SomeManager {
    @AuraEnabled(cacheable=true)
    public static string getAnalyticsKey() {
    }
  
    @AuraEnabled(cacheable=true)
    public static string getOrgId() {
    }
  
    public static Boolean getSecurityFeature() {
    }
  
    public static final mypkg_App.SomeFactory Selector = new mypkg_App.SomeFactory(
      new Map<SObjectType, Type>{
        Project__c.SObjectType => ProjectsSelector.class,
        UserData__c.SObjectType => UserDataSelector.class
      }
    );
  
    public static final mypkg_App.SomeFactory Service = new SomeManager.SomeFactory(
      new Map<Type, Type>{
        IProjectService.class => DefaultProjectService.class,
        IDataService.class => DefaultDataService.class,
        IUserDataService.class => DefaultUserDataService.class,
        ISecurityService.class => DefaultSecurityService.class
      }
    );
  
    private class SomeFactory extends mypkg_App.SomeFactory {
      private class OverrideSettings {
        public String ClassName;
        public String NamespacePrefix;
      }
      private Map<String, String> servicesByClassName = new Map<String, String>();
  
      public SomeFactory(
        Map<Type, Type> serviceInterfaceTypeByServiceImplType
      ) {
      }
  
      public override Object newInstance(Type serviceInterfaceType) {
      }
    }
  
    public class AnotherFactory extends mypkg_App.SomeFactory {
      public AnotherFactory(Map<SObjectType, Type> selectorsBySObjectType) {
      }
  
      public override mypkg_ISObjectSelector newInstance(
        SObjectType sObjectType
        ) {
      }
    }
  
    interface IProjectService {
      Project__c getProject(Id projectId);
    }
  
    enum ProjectType {
      Development,
      Testing,
      Production
    }
  }
  