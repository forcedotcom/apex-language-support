global class OmniInteractionAccessConfig extends Metadata.Metadata {
    global String configName { get; set; }
    global String fullName { get; set; }
    global Boolean isAsyncCardCachingEnabled { get; set; }
    global Boolean isCardApexRemoteDisabled { get; set; }
    global Boolean isCardCacheDisabled { get; set; }
    global Boolean isCardDataTfrmDisabled { get; set; }
    global Boolean isCardIntegrationProcDisabled { get; set; }
    global Boolean isCardRestApiDisabled { get; set; }
    global Boolean isCardSoqlDisabled { get; set; }
    global Boolean isCardSoslDisabled { get; set; }
    global Boolean isCardStreamingApiDisabled { get; set; }
    global Boolean isDataTfrmEncrpFieldsDisabled { get; set; }
    global String masterLabel { get; set; }
    global String setupOwner { get; set; }

    global Object OmniInteractionAccessConfig() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}