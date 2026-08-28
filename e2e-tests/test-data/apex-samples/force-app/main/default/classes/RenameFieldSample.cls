// renameField e2e fixture (W-23631087): field `counter` used via this.counter
// and bare (implicit-this) counter — exercises the declaration + both forms.
public with sharing class RenameFieldSample {
    public Integer counter = 0;

    public void increment() {
        this.counter = this.counter + 1;
    }

    public Integer readCounter() {
        return counter;
    }
}
