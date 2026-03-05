public class WhenElseNotLast {
    public void testSwitch() {
        String value = 'test';
        switch on value {
            when 'one' {
                System.debug('one');
            }
            when else {
                System.debug('else');
            }
            when 'two' {
                System.debug('two');
            }
        }
    }
}
