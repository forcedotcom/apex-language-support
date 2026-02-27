public class AuraEnabledValueNotAllowed {
    @AuraEnabled(scope='invalid')
    public static String getData() {
        return 'test';
    }
}
