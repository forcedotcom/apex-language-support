/**
 * Get, post, and delete feed elements, likes, comments, and bookmarks. You can also search feed elements, share feed elements, and vote on polls.
 */
public class ChatterFeeds {

  public static ConnectApi.ChatterStream createStream(String communityId, ConnectApi.ChatterStreamInput streamInput) {}

  public static Void deleteComment(String communityId, String commentId) {}

  public static deleteFeedElement(String communityId, String feedElementId) {}

  public static Void deleteLike(String communityId, String likeId) {}

  public static Void deleteStream(String communityId, String streamId) {}

  public static ConnectApi.Comment getComment(String communityId, String commentId) {}

  public static ConnectApi.BatchResult[] getCommentBatch(String communityId, List< String > commentIds) {}

  public static ConnectApi.FeedElement getCommentInContext(String communityId, String commentId, Integer pageSize) {}

  public static ConnectApi.CommentPage getCommentsForFeedElement(String communityId, String feedElementId) {}

  public static ConnectApi.CommentPage getCommentsForFeedElement(String communityId, String feedElementId, Boolean threadedCommentsCollapsed) {}

  public static ConnectApi.CommentPage getCommentsForFeedElement(String communityId, String feedElementId, String pageParam, Integer pageSize) {}

  public static ConnectApi.CommentPage getCommentsForFeedElement(String communityId, String feedElementId, String pageParam, Integer pageSize, Boolean threadedCommentsCollapsed) {}

  public static ConnectApi.CommentsCapability getCommentsForFeedElement(String communityId, String feedElementId, Boolean threadedCommentsCollapsed, ConnectApi.FeedCommentSortOrder sortParam) {}

  public static ConnectApi.CommentPage getCommentsForFeedElement(String communityId, String feedElementId, String pageParam, Integer pageSize, Boolean threadedCommentsCollapsed, ConnectApi.FeedCommentSortOrder sortParam) {}

  public static ConnectApi.CommentsCapability getCommentsForFeedElement(String communityId, String feedElementId, ConnectApi.FeedCommentSortOrder sortParam) {}

  public static ConnectApi.CommentsCapability getCommentsForFeedElement(String communityId, String feedElementId, ConnectApi.FeedCommentSortOrder sortParam, Boolean threadedCommentsCollapsed) {}

  public static ConnectApi.ExtensionDefinitions getExtensions(String communityId, String pageParam, Integer pageSize) {}

  public static ConnectApi.Feed getFeed(String communityId, ConnectApi.FeedType feedType) {}

  public static ConnectApi.Feed getFeed(String communityId, ConnectApi.FeedType feedType, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.Feed getFeed(String communityId, ConnectApi.FeedType feedType, String subjectId) {}

  public static ConnectApi.Feed getFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.FeedDirectory getFeedDirectory(String communityId) {}

  public static ConnectApi.FeedElement getFeedElement(String communityId, String feedElementId) {}

  public static ConnectApi.FeedElement getFeedElement(String communityId, String feedElementId, ConnectApi.FeedCommentSortOrder commentSort) {}

  public static ConnectApi.FeedElement getFeedElement(String communityId, String feedElementId, Boolean threadedCommentsCollapsed) {}

  public static ConnectApi.FeedElement getFeedElement(String communityId, String feedElementId, Boolean threadedCommentsCollapsed, ConnectApi.FeedCommentSortOrder commentSort) {}

  public static ConnectApi.FeedElement getFeedElement(String communityId, String feedElementId, Integer recentCommentCount, Integer elementsPerBundle) {}

  public static ConnectApi.FeedElement getFeedElement(String communityId, String feedElementId, Integer recentCommentCount, Integer elementsPerBundle, Boolean threadedCommentsCollapsed) {}

  public static ConnectApi.FeedElement getFeedElement(String communityId, String feedElementId, Integer recentCommentCount, Integer elementsPerBundle, Boolean threadedCommentsCollapsed, ConnectApi.FeedCommentSortOrder commentSort) {}

  public static ConnectApi.FeedElement getFeedElement(String communityId, String feedElementId, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedCommentSortOrder commentSort) {}

  public static ConnectApi.BatchResult[] getFeedElementBatch(String communityId, List< String > feedElementIds) {}

  public static ConnectApi.PollCapability getFeedElementPoll(String communityId, String feedElementId) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromBundle(String communityId, String feedElementId) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromBundle(String communityId, String feedElementId, String pageParam, Integer pageSize, Integer elementsPerBundle, Integer recentCommentCount) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedFilter filter) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedFilter filter, Boolean threadedCommentsCollapsed) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, Boolean showInternalOnly) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedFilter filter) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedFilter filter, Boolean threadedCommentsCollapsed) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String customFilter) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, Boolean showInternalOnly) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, Boolean showInternalOnly, ConnectApi.FeedFilter filter) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, Boolean showInternalOnly, ConnectApi.FeedFilter filter, Boolean threadedCommentsCollapsed) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, Boolean showInternalOnly, String customFilter) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, Boolean showInternalOnly, String customFilter, Boolean threadedCommentsCollapsed) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromFilterFeed(String communityId, String subjectId, String keyPrefix) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromFilterFeed(String communityId, String subjectId, String keyPrefix, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromFilterFeed(String communityId, String subjectId, String keyPrefix, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.FeedElementPage getFeedElementsFromFilterFeedUpdatedSince(String communityId, String subjectId, String keyPrefix, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince) {}

  public static ConnectApi.FeedElementPage getFeedElementsUpdatedSince(String communityId, ConnectApi.FeedType feedType, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince) {}

  public static ConnectApi.FeedElementPage getFeedElementsUpdatedSince(String communityId, ConnectApi.FeedType feedType, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince, ConnectApi.FeedFilter filter) {}

  public static ConnectApi.FeedElementPage getFeedElementsUpdatedSince(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince) {}

  public static ConnectApi.FeedElementPage getFeedElementsUpdatedSince(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince, Boolean showInternalOnly) {}

  public static ConnectApi.FeedElementPage getFeedElementsUpdatedSince(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince, ConnectApi.FeedFilter filter) {}

  public static ConnectApi.FeedElementPage getFeedElementsUpdatedSince(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince, String customFilter) {}

  public static ConnectApi.FeedElementPage getFeedElementsUpdatedSince(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince, Boolean showInternalOnly) {}

  public static ConnectApi.FeedElementPage getFeedElementsUpdatedSince(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince, Boolean showInternalOnly, ConnectApi.FeedFilter filter) {}

  public static ConnectApi.FeedElementPage getFeedElementsUpdatedSince(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince, Boolean showInternalOnly, String customFilter) {}

  public static ConnectApi.Feed getFeedWithFeedElements(String communityId, ConnectApi.FeedType feedType, Integer pageSize) {}

  public static ConnectApi.Feed getFeedWithFeedElements(String communityId, ConnectApi.FeedType feedType, Integer pageSize, Integer recentCommentCount) {}

  public static ConnectApi.Feed getFilterFeed(String communityId, String subjectId, String keyPrefix) {}

  public static ConnectApi.Feed getFilterFeed(String communityId, String subjectId, String keyPrefix, ConnectApi.FeedType sortParam) {}

  public static ConnectApi.FeedDirectory getFilterFeedDirectory(String communityId, String subjectId) {}

  public static ConnectApi.ChatterLike getLike(String communityId, String likeId) {}

  public static ConnectApi.ChatterLikePage getLikesForComment(String communityId, String commentId) {}

  public static ConnectApi.ChatterLikePage getLikesForComment(String communityId, String commentId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.ChatterLikePage getLikesForFeedElement(String communityId, String feedElementId) {}

  public static ConnectApi.ChatterLikePage getLikesForFeedElement(String communityId, String feedElementId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.LinkMetadataCollection getLinkMetadata(String communityId, String urls) {}

  public static ConnectApi.PinnedFeedElements getPinnedFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId) {}

  public static ConnectApi.ReadByPage getReadByForFeedElement(String communityId, String feedElementId) {}

  public static ConnectApi.ReadByPage getReadByForFeedElement(String communityId, String feedElementId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.RelatedFeedPosts getRelatedPosts(String communityId, String feedElementId, ConnectApi.RelatedFeedPostType filter, Integer maxResults) {}

  public static ConnectApi.ChatterStream getStream(String communityId, String streamId) {}

  public static ConnectApi.ChatterStream getStream(String communityId, String streamId, Boolean globalScope) {}

  public static ConnectApi.ChatterStreamPage getStreams(String communityId) {}

  public static ConnectApi.ChatterStreamPage getStreams(String communityId, ConnectApi.SortOrder sortParam) {}

  public static ConnectApi.ChatterStreamPage getStreams(String communityId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.ChatterStreamPage getStreams(String communityId, Integer pageParam, Integer pageSize, ConnectApi.SortOrder sortParam) {}

  public static ConnectApi.ChatterStreamPage getStreams(String communityId, Integer pageParam, Integer pageSize, ConnectApi.SortOrder sortParam, Boolean globalScope) {}

  public static ConnectApi.SupportedEmojis getSupportedEmojis() {}

  public static ConnectApi.CommentPage getThreadsForFeedComment(String communityId, String commentId) {}

  public static ConnectApi.CommentPage getThreadsForFeedComment(String communityId, String commentId, String pageParam, Integer pageSize) {}

  public static ConnectApi.CommentsCapability getThreadsForFeedComment(String communityId, String commentId, Boolean threadedCommentsCollapsed) {}

  public static ConnectApi.FeedElementPage getTopUnansweredQuestions(String communityId) {}

  public static ConnectApi.FeedElementPage getTopUnansweredQuestions(String communityId, ConnectApi.TopUnansweredQuestionsFilterType filter) {}

  public static ConnectApi.FeedElementPage getTopUnansweredQuestions(String communityId, Integer pageSize) {}

  public static ConnectApi.FeedElementPage getTopUnansweredQuestions(String communityId, ConnectApi.FeedFilter filter, Integer pageSize) {}

  public static ConnectApi.VotePage getVotesForComment(String communityId, String commentId, ConnectApi.UpDownVoteValue vote) {}

  public static ConnectApi.VotePage getVotesForComment(String communityId, String commentId, ConnectApi.UpDownVoteValue vote, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.VotePage getVotesForFeedElement(String communityId, String feedElementId, ConnectApi.UpDownVoteValue vote) {}

  public static ConnectApi.VotePage getVotesForFeedElement(String communityId, String feedElementId, ConnectApi.UpDownVoteValue vote, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.FeedEntityIsEditable isCommentEditableByMe(String communityId, String commentId) {}

  public static ConnectApi.FeedEntityIsEditable isFeedElementEditableByMe(String communityId, String feedElementId) {}

  public static ConnectApi.FeedModifiedInfo isModified(String communityId, ConnectApi.FeedType feedType, String subjectId, String since) {}

  public static ConnectApi.ChatterLike likeComment(String communityId, String commentId) {}

  public static ConnectApi.ChatterLike likeFeedElement(String communityId, String feedElementId) {}

  public static ConnectApi.Comment postCommentToFeedElement(String communityId, String feedElementId, String text) {}

  public static ConnectApi.Comment postCommentToFeedElement(String communityId, String feedElementId, ConnectApi.CommentInput comment, ConnectApi.BinaryInput feedElementFileUpload) {}

  public static ConnectApi.FeedElement postFeedElement(String communityId, String subjectId, ConnectApi.FeedElementType feedElementType, String text) {}

  public static ConnectApi.FeedElement postFeedElement(String communityId, ConnectApi.FeedElementInput feedElement) {}

  public static ConnectApi.BatchResult[] postFeedElementBatch(String communityId, List<ConnectApi.BatchInput> feedElements) {}

  public static ConnectApi.FeedElement publishDraftFeedElement(String communityId, String feedElementId, ConnectApi.FeedElementInput feedElement) {}

  public static ConnectApi.FeedElementPage searchFeedElements(String communityId, String q) {}

  public static ConnectApi.FeedElementPage searchFeedElements(String communityId, String q, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.FeedElementPage searchFeedElements(String communityId, String q, Boolean threadedCommentsCollapsed) {}

  public static ConnectApi.FeedElementPage searchFeedElements(String communityId, String q, String pageParam, Integer pageSize) {}

  public static ConnectApi.FeedElementPage searchFeedElements(String communityId, String q, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.FeedElementPage searchFeedElements(String communityId, String q, String pageParam, Integer pageSize, Boolean threadedCommentsCollapsed) {}

  public static ConnectApi.FeedElementPage searchFeedElements(String communityId, String q, Integer recentCommentCount, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.FeedElementPage searchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, String q) {}

  public static ConnectApi.FeedElementPage searchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q) {}

  public static ConnectApi.FeedElementPage searchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q) {}

  public static ConnectApi.FeedElementPage searchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, ConnectApi.FeedFilter filter) {}

  public static ConnectApi.FeedElementPage searchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, String q) {}

  public static ConnectApi.FeedElementPage searchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q) {}

  public static ConnectApi.FeedElementPage searchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q) {}

  public static ConnectApi.FeedElementPage searchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, ConnectApi.FeedFilter filter) {}

  public static ConnectApi.FeedElementPage searchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, String customFilter) {}

  public static ConnectApi.FeedElementPage searchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, Boolean showInternalOnly) {}

  public static ConnectApi.FeedElementPage searchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, Boolean showInternalOnly, ConnectApi.FeedFilter filter) {}

  public static ConnectApi.FeedElementPage searchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, Boolean showInternalOnly, String customFilter) {}

  public static ConnectApi.FeedElementPage searchFeedElementsInFilterFeed(String communityId, String subjectId, String keyPrefix, String q) {}

  public static ConnectApi.FeedElementPage searchFeedElementsInFilterFeed(String communityId, String subjectId, String keyPrefix, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q) {}

  public static ConnectApi.FeedElementPage searchFeedElementsInFilterFeed(String communityId, String subjectId, String keyPrefix, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q) {}

  public static ConnectApi.ChatterStreamPage searchStreams(String communityId, String q) {}

  public static ConnectApi.ChatterStreamPage searchStreams(String communityId, String q, ConnectApi.SortOrder sortParam) {}

  public static ConnectApi.ChatterStreamPage searchStreams(String communityId, String q, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.ChatterStreamPage searchStreams(String communityId, String q, Integer pageParam, Integer pageSize, ConnectApi.SortOrder sortParam) {}

  public static ConnectApi.ChatterStreamPage searchStreams(String communityId, String q, Integer pageParam, Integer pageSize, ConnectApi.SortOrder sortParam, Boolean globalScope) {}

  public static ConnectApi.VerifiedCapability setCommentIsVerified(String communityId, String commentId, Boolean isVerified) {}

  public static ConnectApi.VerifiedCapability setCommentIsVerifiedByAnonymized(String communityId, String commentId, Boolean isVerified, Boolean isVerifiedByAnonymized) {}

  public static ConnectApi.UpDownVoteCapability setCommentVote(String communityId, String commentId, ConnectApi.UpDownVoteCapabilityInput upDownVote) {}

  public static ConnectApi.StatusCapability setFeedCommentStatus(String communityId, String commentId, ConnectApi.StatusCapabilityInput status) {}

  public static ConnectApi.CloseCapability setFeedElementIsClosed(String communityId, String feedElementId, Boolean isClosed) {}

  public static ConnectApi.UpDownVoteCapability setFeedElementVote(String communityId, String feedElementId, ConnectApi.UpDownVoteCapabilityInput upDownVote) {}

  public static ConnectApi.StatusCapability setFeedEntityStatus(String communityId, String feedElementId, ConnectApi.StatusCapabilityInput status) {}

  public static ConnectApi.MuteCapability setIsMutedByMe(String communityId, String feedElementId, Boolean isMutedByMe) {}

  public static ConnectApi.ReadByCapability setIsReadByMe(String communityId, String feedElementId, ConnectApi.ReadByCapabilityInput readBy) {}

  public static ConnectApi.ReadByCapability setIsReadByMe(String communityId, String feedElementId, Boolean isReadByMe) {}

  public static ConnectApi.Comment updateComment(String communityId, String commentId, ConnectApi.CommentInput comment) {}

  public static ConnectApi.DirectMessageCapability updateDirectMessage(String communityId, String feedElementId, ConnectApi.DirectMessageCapabilityInput directMessage) {}

  public static ConnectApi.FeedElement updateFeedElement(String communityId, String feedElementId, ConnectApi.FeedElementInput feedElement) {}

  public static ConnectApi.BookmarksCapability updateFeedElementBookmarks(String communityId, String feedElementId, ConnectApi.BookmarksCapabilityInput bookmarks) {}

  public static ConnectApi.BookmarksCapability updateFeedElementBookmarks(String communityId, String feedElementId, Boolean isBookmarkedByCurrentUser) {}

  public static ConnectApi.BatchResult[] updateFeedElementReadByCapabilityBatch(String communityId, List< String > feedElementIds, ConnectApi.ReadByCapabilityInput readBy) {}

  public static ConnectApi.BatchResult[] updateFeedElementReadByCapabilityBatch(String communityId, List< String > feedElementIds, Boolean isReadByMe) {}

  public static ConnectApi.ChatterLikePage updateLikeForComment(String communityId, String commentId, Boolean isLikedByCurrentUser) {}

  public static ConnectApi.ChatterLikePage updateLikeForFeedElement(String communityId, String feedElementId, Boolean isLikedByCurrentUser) {}

  public static ConnectApi.PinCapability updatePinnedFeedElements(String communityId, ConnectApi.FeedType feedType, String subjectId, ConnectApi.PinCapabilityInput pin) {}

  public static ConnectApi.ChatterStream updateStream(String communityId, String streamId, ConnectApi.ChatterStreamInput streamInput) {}

  public static ConnectApi.PollCapability voteOnFeedElementPoll(String communityId, String feedElementId, String myChoiceId) {}

  public static Void setTestGetFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedFilter filter, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedFilter filter, Boolean threadedCommentsCollapsed, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, Boolean showInternalOnly, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedFilter filter, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedFilter filter, Boolean threadedCommentsCollapsed, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String customFilter, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, Boolean showInternalOnly, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, Boolean showInternalOnly, ConnectApi.FeedFilter filter, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, Boolean showInternalOnly, ConnectApi.FeedFilter filter, Boolean threadedCommentsCollapsed, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, Boolean showInternalOnly, String customFilter, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, Boolean showInternalOnly, String customFilter, Boolean threadedCommentsCollapsed, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsFromFilterFeed(String communityId, String subjectId, String keyPrefix, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsFromFilterFeed(String communityId, String subjectId, String keyPrefix, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsFromFilterFeed(String communityId, String subjectId, String keyPrefix, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsFromFilterFeedUpdatedSince(String communityId, String subjectId, String keyPrefix, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsUpdatedSince(String communityId, ConnectApi.FeedType feedType, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsUpdatedSince(String communityId, ConnectApi.FeedType feedType, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince, ConnectApi.FeedFilter filter, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsUpdatedSince(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsUpdatedSince(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince, Boolean showInternalOnly, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsUpdatedSince(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince, ConnectApi.FeedFilter filter, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsUpdatedSince(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince, String customFilter, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsUpdatedSince(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince, Boolean showInternalOnly, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsUpdatedSince(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince, Boolean showInternalOnly, ConnectApi.FeedFilter filter, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetFeedElementsUpdatedSince(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, Integer elementsPerBundle, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince, Boolean showInternalOnly, String customFilter, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetRelatedPosts(String communityId, String feedElementId, ConnectApi.RelatedFeedPostType filter, Integer maxResults, ConnectApi.RelatedFeedPosts result) {}

  public static Void setTestGetTopUnansweredQuestions(String communityId, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetTopUnansweredQuestions(String communityId, ConnectApi.TopUnansweredQuestionsFilterType filter, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetTopUnansweredQuestions(String communityId, Integer pageSize, ConnectApi.FeedElementPage result) {}

  public static Void setTestGetTopUnansweredQuestions(String communityId, ConnectApi.FeedFilter filter, Integer pageSize, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchFeedElements(String communityId, String q, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchFeedElements(String communityId, String q, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchFeedElements(String communityId, String q, Boolean threadedCommentsCollapsed, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchFeedElements(String communityId, String q, String pageParam, Integer pageSize, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchFeedElements(String communityId, String q, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchFeedElements(String communityId, String q, String pageParam, Integer pageSize, Boolean threadedCommentsCollapsed, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchFeedElements(String communityId, String q, Integer recentCommentCount, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, String q, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, ConnectApi.FeedFilter filter, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, String q, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, ConnectApi.FeedFilter filter, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, String customFilter, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, Boolean showInternalOnly, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, Boolean showInternalOnly, ConnectApi.FeedFilter filter, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchFeedElementsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, Boolean showInternalOnly, String customFilter, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchFeedElementsInFilterFeed(String communityId, String subjectId, String keyPrefix, String q, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchFeedElementsInFilterFeed(String communityId, String subjectId, String keyPrefix, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchFeedElementsInFilterFeed(String communityId, String subjectId, String keyPrefix, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, ConnectApi.FeedElementPage result) {}

  public static Void setTestSearchStreams(String communityId, String q, ConnectApi.ChatterStreamPage result) {}

  public static Void setTestSearchStreams(String communityId, String q, ConnectApi.SortOrder sortParam, ConnectApi.ChatterStreamPage result) {}

  public static Void setTestSearchStreams(String communityId, String q, Integer pageParam, Integer pageSize, ConnectApi.ChatterStreamPage result) {}

  public static Void setTestSearchStreams(String communityId, String q, Integer pageParam, Integer pageSize, ConnectApi.SortOrder sortParam, ConnectApi.ChatterStreamPage result) {}

  public static Void setTestSearchStreams(String communityId, String q, Integer pageParam, Integer pageSize, ConnectApi.SortOrder sortParam, Boolean globalScope, ConnectApi.ChatterStreamPage result) {}

  public static Void deleteFeedItem(String communityId, String feedItemId) {}

  public static ConnectApi.CommentPage getCommentsForFeedItem(String communityId, String feedItemId) {}

  public static ConnectApi.CommentPage getCommentsForFeedItem(String communityId, String feedItemId, String pageParam, Integer pageSize) {}

  public static ConnectApi.FeedItem getFeedItem(String communityId, String feedItemId) {}

  public static ConnectApi.BatchResult[] getFeedItemBatch(String communityId, List< String > feedItemIds) {}

  public static ConnectApi.FeedItemPage getFeedItemsFromFeed(String communityId, ConnectApi.FeedType feedType) {}

  public static ConnectApi.FeedItemPage getFeedItemsFromFeed(String communityId, ConnectApi.FeedType feedType, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.FeedItemPage getFeedItemsFromFeed(String communityId, ConnectApi.FeedType feedType, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.FeedItemPage getFeedItemsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId) {}

  public static ConnectApi.FeedItemPage getFeedItemsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.FeedItemPage getFeedItemsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.FeedItemPage getFeedItemsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, Boolean showInternalOnly) {}

  public static ConnectApi.FeedItemPage getFeedItemsFromFilterFeed(String communityId, String subjectId, String keyPrefix) {}

  public static ConnectApi.FeedItemPage getFeedItemsFromFilterFeed(String communityId, String subjectId, String keyPrefix, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.FeedItemPage getFeedItemsFromFilterFeed(String communityId, String subjectId, String keyPrefix, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.FeedItemPage getFeedItemsFromFilterFeedUpdatedSince(String communityId, String subjectId, String keyPrefix, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince) {}

  public static ConnectApi.FeedItemPage getFeedItemsUpdatedSince(String communityId, ConnectApi.FeedType feedType, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince) {}

  public static ConnectApi.FeedItemPage getFeedItemsUpdatedSince(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince) {}

  public static ConnectApi.FeedItemPage getFeedItemsUpdatedSince(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince, Boolean showInternalOnly) {}

  public static ConnectApi.FeedPoll getFeedPoll(String communityId, String feedItemId) {}

  public static ConnectApi.ChatterLikePage getLikesForFeedItem(String communityId, String feedItemId) {}

  public static ConnectApi.ChatterLikePage getLikesForFeedItem(String communityId, String feedItemId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.ChatterLike likeFeedItem(String communityId, String feedItemId) {}

  public static ConnectApi.Comment postComment(String communityId, String feedItemId, String text) {}

  public static ConnectApi.Comment postComment(String communityId, String feedItemId, ConnectApi.CommentInput comment, ConnectApi.BinaryInput feedItemFileUpload) {}

  public static ConnectApi.FeedElement postFeedElement(String communityId, ConnectApi.FeedElementInput feedElement, ConnectApi.BinaryInput feedElementFileUpload) {}

  public static ConnectApi.FeedItem postFeedItem(String communityId, ConnectApi.FeedType feedType, String subjectId, String text) {}

  public static ConnectApi.FeedItem postFeedItem(String communityId, ConnectApi.FeedType feedType, String subjectId, ConnectApi.FeedItemInput feedItemInput, ConnectApi.BinaryInput feedItemFileUpload) {}

  public static ConnectApi.FeedItemPage searchFeedItems(String communityId, String q) {}

  public static ConnectApi.FeedItemPage searchFeedItems(String communityId, String q, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.FeedItemPage searchFeedItems(String communityId, String q, String pageParam, Integer pageSize) {}

  public static ConnectApi.FeedItemPage searchFeedItems(String communityId, String q, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.FeedItemPage searchFeedItems(String communityId, String q, Integer recentCommentCount, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.FeedItemPage searchFeedItemsInFeed(String communityId, ConnectApi.FeedType feedType, String q) {}

  public static ConnectApi.FeedItemPage searchFeedItemsInFeed(String communityId, ConnectApi.FeedType feedType, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q) {}

  public static ConnectApi.FeedItemPage searchFeedItemsInFeed(String communityId, ConnectApi.FeedType feedType, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q) {}

  public static ConnectApi.FeedItemPage searchFeedItemsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, String q) {}

  public static ConnectApi.FeedItemPage searchFeedItemsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q) {}

  public static ConnectApi.FeedItemPage searchFeedItemsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q) {}

  public static ConnectApi.FeedItemPage searchFeedItemsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, Boolean showInternalOnly) {}

  public static ConnectApi.FeedItemPage searchFeedItemsInFilterFeed(String communityId, String subjectId, String keyPrefix, String q) {}

  public static ConnectApi.FeedItemPage searchFeedItemsInFilterFeed(String communityId, String subjectId, String keyPrefix, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q) {}

  public static ConnectApi.FeedItemPage searchFeedItemsInFilterFeed(String communityId, String subjectId, String keyPrefix, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q) {}

  public static ConnectApi.FeedElement shareFeedElement(String communityId, String subjectId, ConnectApi.FeedElementType feedElementType, String originalFeedElementId) {}

  public static ConnectApi.FeedItem shareFeedItem(String communityId, ConnectApi.FeedType feedType, String subjectId, String originalFeedItemId) {}

  public static ConnectApi.FeedItem updateBookmark(String communityId, String feedItemId, Boolean isBookmarkedByCurrentUser) {}

  public static ConnectApi.FeedPoll voteOnFeedPoll(String communityId, String feedItemId, String myChoiceId) {}

  public static Void setTestGetFeedItemsFromFeed(String communityId, ConnectApi.FeedType feedType, ConnectApi.FeedItemPage result) {}

  public static Void setTestGetFeedItemsFromFeed(String communityId, ConnectApi.FeedType feedType, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedItemPage result) {}

  public static Void setTestGetFeedItemsFromFeed(String communityId, ConnectApi.FeedType feedType, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedItemPage result) {}

  public static Void setTestGetFeedItemsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, ConnectApi.FeedItemPage result) {}

  public static Void setTestGetFeedItemsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedItemPage result) {}

  public static Void setTestGetFeedItemsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedItemPage result) {}

  public static Void setTestGetFeedItemsFromFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, Boolean showInternalOnly, ConnectApi.FeedItemPage result) {}

  public static Void setTestGetFeedItemsFromFilterFeed(String communityId, String subjectId, String keyPrefix, ConnectApi.FeedItemPage result) {}

  public static Void setTestGetFeedItemsFromFilterFeed(String communityId, String subjectId, String keyPrefix, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedItemPage result) {}

  public static Void setTestGetFeedItemsFromFilterFeed(String communityId, String subjectId, String keyPrefix, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedItemPage result) {}

  public static Void setTestGetFeedItemsFromFilterFeedUpdatedSince(String communityId, String subjectId, String keyPrefix, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String updatedSince, ConnectApi.FeedItemPage result) {}

  public static Void setTestGetFeedItemsUpdatedSince(String communityId, ConnectApi.FeedType feedType, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince, ConnectApi.FeedItemPage results) {}

  public static Void setTestGetFeedItemsUpdatedSince(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince, ConnectApi.FeedItemPage result) {}

  public static Void setTestGetFeedItemsUpdatedSince(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, String updatedSince, Boolean showInternalOnly, ConnectApi.FeedItemPage result) {}

  public static Void searchFeedItems(String communityId, String q, ConnectApi.FeedItemPage result) {}

  public static Void setTestSearchFeedItems(String communityId, String q, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedItemPage result) {}

  public static Void setTestSearchFeedItems(String communityId, String q, String pageParam, Integer pageSize, ConnectApi.FeedItemPage result) {}

  public static Void setTestSearchFeedItems(String communityId, String q, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedItemPage result) {}

  public static Void setTestSearchFeedItems(String communityId, String q, Integer recentCommentCount, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedItemPage result) {}

  public static Void setTestSearchFeedItemsInFeed(String communityId, ConnectApi.FeedType feedType, String q, ConnectApi.FeedItemPage result) {}

  public static Void setTestSearchFeedItemsInFeed(String communityId, ConnectApi.FeedType feedType, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, ConnectApi.FeedItemPage result) {}

  public static Void setTestSearchFeedItemsInFeed(String communityId, ConnectApi.FeedType feedType, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, ConnectApi.FeedItemPage result) {}

  public static Void setTestSearchFeedItemsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, String q, ConnectApi.FeedItemPage result) {}

  public static Void setTestSearchFeedItemsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, ConnectApi.FeedItemPage result) {}

  public static Void setTestSearchFeedItemsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, ConnectApi.FeedItemPage result) {}

  public static Void setTestSearchFeedItemsInFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, Boolean showInternalOnly, ConnectApi.FeedItemPage result) {}

  public static Void setTestSearchFeedItemsInFilterFeed(String communityId, String subjectId, String keyPrefix, String q, ConnectApi.FeedItemPage result) {}

  public static Void setTestSearchFeedItemsInFilterFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, String keyPrefix, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, ConnectApi.FeedItemPage result) {}

  public static Void setTestSearchFeedItemsInFilterFeed(String communityId, ConnectApi.FeedType feedType, String subjectId, String keyPrefix, Integer recentCommentCount, ConnectApi.FeedDensity density, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, String q, ConnectApi.FeedItemPage result) {}

}