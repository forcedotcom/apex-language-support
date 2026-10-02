/**
 * This class contains details about the card payment method.
 */
global with sharing class CardPaymentMethodResponse {
    global Object CardPaymentMethodResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the Salesforce payments account to which this payment method is linked.
     */
    global void setAccountId(Id accountId) { }

    /**
     * Sets whether a token for recurring payments is being requested or not.
     */
    global void setAutoPay(Boolean autoPay) { }

    /**
     * Sets the card Bank Identification Number (BIN).
     */
    global void setCardBin(String cardBin) { }

    /**
     * Sets the card category.
     */
    global void setCardCategory(commercepayments.CardCategory cardCategory) { }

    /**
     * Sets the first name of the card holder.
     */
    global void setCardHolderFirstName(String cardHolderFirstName) { }

    /**
     * Sets the last name of the card holder.
     */
    global void setCardHolderLastName(String cardHolderLastName) { }

    /**
     * Sets the name of the card holder.
     */
    global void setCardHolderName(String cardHolderName) { }

    /**
     * Sets the last four digits of the card.
     */
    global void setCardLastFour(String cardLastFour) { }

    /**
     * Specifies the type of the credit card issuer.
     */
    global void setCardType(String cardType) { }

    /**
     * Sets the credit card issuer.
     */
    global void setCardTypeCategory(commercepayments.CardType cardTypeCategory) { }

    /**
     * Sets the notes added by a user for card payment.
     */
    global void setComments(String comments) { }

    /**
     * Sets the display card number.
     */
    global void setDisplayCardNumber(String displayCardNumber) { }

    /**
     * Sets the email address of the card holder.
     */
    global void setEmail(String email) { }

    /**
     * Sets the month of expiry of the card.
     */
    global void setExpiryMonth(Integer expiryMonth) { }

    /**
     * Sets the year of expiry of the card.
     */
    global void setExpiryYear(Integer expiryYear) { }

    /**
     * Sets the nickname of the card.
     */
    global void setNickName(String nickName) { }

    /**
     * Sets the month the card becomes active.
     */
    global void setStartMonth(Integer startMonth) { }

    /**
     * Sets the year the card becomes active.
     */
    global void setStartYear(Integer startYear) { }

    global override virtual String toString() { return null; }
}