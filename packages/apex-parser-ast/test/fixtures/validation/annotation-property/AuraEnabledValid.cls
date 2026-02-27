public class AuraEnabledValid {
    @AuraEnabled
    public static String method1() {
        return 'test';
    }

    @AuraEnabled(cacheable=true)
    public static String method2() {
        return 'test';
    }

    @AuraEnabled(cacheable=true, continuation=true)
    public static String method3() {
        return 'test';
    }

    @AuraEnabled(cacheable=true, scope='global')
    public static String method4() {
        return 'test';
    }

    @AuraEnabled(translatable=true)
    public String field1;
}
