public class Account {
    public String Name { get; set; }
    public String BillingStreet { get; set; }
    public String BillingCity { get; set; }
    public String BillingState { get; set; }
    public String BillingPostalCode { get; set; }
    public String BillingCountry { get; set; }
    
    public Account() {
        // Default constructor
    }
    
    public Account(String name) {
        this.Name = name;
    }
    
    public void updateBillingAddress(String street, String city, String state, String postalCode, String country) {
        this.BillingStreet = street;
        this.BillingCity = city;
        this.BillingState = state;
        this.BillingPostalCode = postalCode;
        this.BillingCountry = country;
    }
}
