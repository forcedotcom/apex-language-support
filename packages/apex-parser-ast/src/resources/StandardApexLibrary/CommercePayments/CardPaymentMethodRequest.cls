/**
 * Sends data related to a card payment method to a gateway adapter during a service call.
 * <p>Usage
 * This class contains details about the card used as a payment method for authorization, sale, or tokenization transaction requests. The gateway adapter reads the fields of this class object while constructing a transaction JSON request to send to the payment gateway. The object of this class is available as the cardPaymentMethod field in the SaleApiPaymentMethodRequest Class, AuthApiPaymentMethodRequest Class, and PaymentMethodTokenizationRequest Class.
 */
global with sharing class CardPaymentMethodRequest extends commercepayments.BasePaymentMethodRequest {
    /**
     * Customer account for this payment method.
     * <p>String
     */
    global String accountId { get; set; }
    /**
     * Indicates whether a token is being requested so that the payment method can be used for recurring payments.
     * <p>Boolean
     */
    global Boolean autoPay { get; set; }
    /**
     * Indicates whether a card payment method is for a credit card or debit card.
     * <p>CardCategory
     */
    global commercepayments.CardCategory cardCategory { get; set; }
    /**
     * The first name of the cardholder for the card payment method.
     * <p>String
     */
    global String cardHolderFirstName { get; set; }
    /**
     * The last name of the cardholder for the card payment method.
     * <p>String
     */
    global String cardHolderLastName { get; set; }
    /**
     * Full name of the cardholder on the card payment method.
     * <p>String
     */
    global String cardHolderName { get; set; }
    /**
     * System-defined unique ID for the card payment method.
     * <p>String
     */
    global String cardNumber { get; set; }
    /**
     * Defines the credit card bank. Possible values are AmericanExpress, DinersClub, JCB, Maestro, MasterCard, andVisa.
     * <p>CardType
     */
    global commercepayments.CardType cardType { get; set; }
    /**
     * The card security code for the credit or debit card on a card payment method.
     * <p>String
     */
    global String cvv { get; set; }
    /**
     * Email address of the cardholder for the credit or debit card on a card payment method.
     * <p>String
     */
    global String email { get; set; }
    /**
     * Expiration month for the credit or debit card on a card payment method.
     * <p>Integer
     */
    global Integer expiryMonth { get; set; }
    /**
     * Expiration year of the credit or debit card for the card payment method.
     * <p>Integer
     */
    global Integer expiryYear { get; set; }
    /**
     * Input field for the card type. This field doesn’t store the card type directly, but instead populates CardBin, LastFour, and DisplayCardNumber based on the value entered in inputCardType.
     * <p>String
     */
    global String inputCardType { get; set; }
    /**
     * The credit or debit card becomes valid on the first day of the startMonth in the startYear
     * <p>Integer
     */
    global Integer startMonth { get; set; }
    /**
     * Year during which the credit or debit card becomes valid.
     * <p>Integer
     */
    global Integer startYear { get; set; }

    /**
     * Sets the cardCategory value for the card payment method request.
     */
    global Object CardPaymentMethodRequest(commercepayments.CardCategory cardCategory) { return null; }

    /**
     * Maintains the integrity of lists of type CardPaymentMethodRequest by determining the equality of external objects in a list. This method is dynamic and based on the equals method in Java.
     */
    global override virtual Boolean equals(Object obj) { return false; }

    /**
     * Maintains the integrity of lists of type CardPaymentMethodRequest.
     */
    global override virtual Integer hashCode() { return 0; }

    /**
     * Converts a date to a string.
     */
    global override virtual String toString() { return null; }
}