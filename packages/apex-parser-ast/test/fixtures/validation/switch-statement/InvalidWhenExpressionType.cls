public class InvalidWhenExpressionType {
    public void runSwitch() {
        String value = 'test';
        switch on value {
            when 123 {
                System.debug('wrong - integer in string switch');
            }
            when else {
                System.debug('other');
            }
        }
    }
}
