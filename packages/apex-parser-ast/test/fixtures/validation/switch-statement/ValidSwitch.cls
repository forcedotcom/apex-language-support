public class ValidSwitch {
    public void testSwitch() {
        String value = 'test';
        switch on value {
            when 'one' {
                System.debug('one');
            }
            when 'two' {
                System.debug('two');
            }
            when else {
                System.debug('other');
            }
        }
    }
}
