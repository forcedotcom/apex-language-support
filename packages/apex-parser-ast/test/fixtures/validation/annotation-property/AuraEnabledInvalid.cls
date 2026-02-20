public class AuraEnabledInvalid {
    @AuraEnabled(scope='invalid')
    public static String method1() {
        return 'test';
    }

    @AuraEnabled(cacheable='notboolean')
    public static String method2() {
        return 'test';
    }
}
