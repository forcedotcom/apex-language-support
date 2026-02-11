public class InvalidWhenLiteralExpression {
    public void runSwitch() {
        String value = 'test';
        String localVar = 'a';
        switch on value {
            when localVar {
                System.debug('wrong - local variable in when');
            }
            when else {
                System.debug('other');
            }
        }
    }
}
