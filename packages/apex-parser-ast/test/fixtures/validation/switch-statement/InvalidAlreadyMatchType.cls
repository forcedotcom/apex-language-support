public class InvalidAlreadyMatchType {
    public void testInvalidAlreadyMatchType() {
        Account acc = new Account();
        
        // Invalid: when Account already matches switch expression type Account
        switch on acc {
            when Account acc2 {
                // This is invalid because Account already matches the switch type
            }
            when Contact con {
                // This is valid - different type
            }
        }
    }
}
