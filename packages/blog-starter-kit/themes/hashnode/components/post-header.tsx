import moment from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { twJoin } from 'tailwind-merge';

import { resizeImage } from '@starter-kit/utils/image';
// @ts-ignore
import handleMathJax from '@starter-kit/utils/handle-math-jax';
import { MorePostsEdgeFragment, PostFullFragment } from '../generated/graphql';
import { blurImageDimensions } from '../utils/const/images';
import { getBlurHash, imageReplacer } from '../utils/image';
import CoAuthorsModal from './co-authors-modal';
import CustomImage from './custom-image';
import ProfileImage from './profile-image';
import TocRenderDesign from './toc-render-design';
const OtherPostsOfAccount = dynamic(() => import('./other-posts-of-account'), { ssr: false });
const AboutAuthor = dynamic(() => import('./about-author'), { ssr: false });

import { useEmbeds } from '@starter-kit/utils/renderer/hooks/useEmbeds';
import { loadIframeResizer } from '@starter-kit/utils/renderer/services/embed';
import { Fragment } from 'react';
import { BookOpenSVG, HeartSVG } from './icons/svgs';  // Import the HeartSVG icon for reactions
// @ts-ignore
import { triggerCustomWidgetEmbed } from '@starter-kit/utils/trigger-custom-widget-embed';
import { createPostUrl } from '../utils/urls';

moment.extend(relativeTime);
moment.extend(localizedFormat);

type Props = {
	post: PostFullFragment;
	morePosts: MorePostsEdgeFragment[];
};

const PostFloatingMenu = dynamic(() => import('./post-floating-bar'), { ssr: false });
const PostCommentsSidebar = dynamic(() => import('./post-comments-sidebar'), { ssr: false });

const PublicationSubscribeStandOut = dynamic(() => import('./publication-subscribe-standout'), {
	ssr: false,
});

export const PostHeader = ({ post, morePosts }: Props) => {
	const postContentEle = useRef<HTMLDivElement>(null);
	const [selectedFilter, setSelectedFilter] = useState('totalReactions');
	const toc = post.features?.tableOfContents?.isEnabled
		? post.features?.tableOfContents?.items.flat()
		: [];
	const memoizedPostContent = useMemo(
		() => imageReplacer(post.content?.html, true),
		[post.content?.html],
	);
	const [showCommentsSheet, setShowCommentsSheet] = useState(false);
	const tags = (post.tags ?? []).map((tag) => {
		return {
			_id: tag.id,
			slug: tag.slug,
			name: tag.name,
			isActive: true,
			isApproved: true,
		};
	});

	const shareText = `${post.title}\r\n{ by ${
		post.author.socialMediaLinks?.twitter
			? `@${post.author.socialMediaLinks?.twitter
					.substring(post.author.socialMediaLinks?.twitter.lastIndexOf('/') + 1)
					.replace('@', '')}`
			: post.author.name
	} } from @hashnode`;

	const handleOpenComments = () => {
		setShowCommentsSheet(true);
	};

	const filteredPostsWithoutCurrentPost = morePosts.filter(
		(postNode: any) => postNode.node.id !== post.id,
	);
	const top3FilteredPosts = filteredPostsWithoutCurrentPost.slice(0, 3);
	const [, setMobMount] = useState(false);
	const [canLoadEmbeds, setCanLoadEmbeds] = useState(false);
	useEmbeds({ enabled: canLoadEmbeds });
	const absolutePostURL = createPostUrl(post, post.publication);
	if (post.hasLatexInPost) {
		setTimeout(() => {
			handleMathJax(true);
		}, 500);
	}
	const [isCoAuthorModalVisible, setIsCoAuthorModalVisible] = useState(false);
	const closeCoAuthorModal = () => {
		setIsCoAuthorModalVisible(false);
	};
	const openCoAuthorModal = () => {
		setIsCoAuthorModalVisible(true);
	};
	useEffect(() => {
		if (screen.width <= 425) {
			setMobMount(true);
		}

		if (!post) {
			return;
		}

		// TODO:
		// More of an alert, did this below to wrap async funcs inside useEffect
		(async () => {
			await loadIframeResizer();
			triggerCustomWidgetEmbed(post.publication?.id.toString());
			setCanLoadEmbeds(true);
		})();
	}, []);
	const authorsArray = [post.author, ...(post.coAuthors || [])];
	return (
		<Fragment>
			<div className="blog-article-page container relative mx-auto grid grid-cols-8">
				<div className="col-span-full lg:col-span-6 lg:col-start-2">
					{/* Top cover */}
					{post.coverImage?.url && !post.preferences.stickCoverToBottom && (
						<div className="relative">
							<CustomImage
								className="mb-0 block w-full"
								placeholder="blur"
								originalSrc={post.coverImage.url}
								src={resizeImage(post.coverImage.url, {
									w: 1600,
									h: 840,
									...(!post.coverImage.isPortrait ? { c: 'thumb' } : { fill: 'blur' }),
								})}
								blurDataURL={getBlurHash(
									resizeImage(post.coverImage.url, {
										...blurImageDimensions,
										...(!post.coverImage.isPortrait ? { c: 'thumb' } : { fill: 'blur' }),
									}),
								)}
								width={1600}
								height={840}
								alt={post.title}
								priority
								layout="responsive"
							/>
						</div>
					)}

					{/* Article title */}
					<div
						className={twJoin(
							`font-heading mt-6 break-words px-4 text-center text-3xl font-extrabold text-slate-900 dark:text-white md:mt-10 md:px-5 md:text-4xl lg:px-8 xl:px-20 xl:text-5xl`,
							post.subtitle ? `mb-5` : `mb-8 md:mb-14`,
						)}
					>
						<h1 className="leading-snug" data-query="post-title">
							{post.title}
						</h1>
					</div>

					{/* Article subtitle */}
					{post.subtitle && (
						<div className="font-heading mb-8 px-4 text-center md:mb-14 md:px-5 lg:px-8 xl:px-20">
							<h2 className="text-2xl leading-snug text-slate-700 dark:text-slate-400 md:text-3xl xl:text-3xl">
								{post.subtitle}
							</h2>
						</div>
					)}

					<div className="relative z-20 mb-8 flex flex-row flex-wrap items-center justify-center px-4 md:-mt-7 md:mb-14 md:text-lg last:md:mb-10">
						<div className="mb-5 flex w-full flex-row items-center justify-center md:mb-0 md:w-auto md:justify-start">
							{authorsArray.map((coAuthor, index) => (
								<div
									key={coAuthor.id?.toString()}
									style={{ zIndex: index + 1 }}
									className={twJoin(
										'overflow-hidden rounded-full  bg-slate-200  dark:bg-white/20 md:mr-3',
										index > 0 ? 'hidden md:block' : '',
										authorsArray.length === 1
											? 'h-10 w-10 md:h-12 md:w-12'
											: 'h-8 w-8 border-2 border-slate-100 dark:border-slate-800 md:h-9 md:w-9 [&:not(:first-of-type)]:-ml-3 md:[&:not(:first-of-type)]:-ml-6 ',
									)}
								>
									<ProfileImage user={coAuthor} width="200" height="200" hoverDisabled={true} />
								</div>
							))}
							{post.coAuthors && post.coAuthors.length > 0 && (
								<button
									onClick={openCoAuthorModal}
									style={{ zIndex: post.coAuthors?.length }}
									className="border-1-1/2 relative -ml-3 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-slate-100 bg-slate-100 px-1 group-hover:border-slate-200 dark:border-slate-800 dark:bg-slate-600 dark:text-white group-hover:dark:border-slate-700 md:hidden"
								>
									<p className="truncate text-xs font-normal">+{post.coAuthors.length}</p>
								</button>
							)}
							<div className="ml-3 flex flex-col items-start md:hidden">
								<Link
									href={`/u/${post.author.username}`}
									className="text-sm font-semibold text-slate-900 dark:text-white"
								>
									{post.author.name}
								</Link>
								<div className="flex items-center space-x-2">
									<span className="text-xs text-slate-500 dark:text-slate-400">
										{moment(post.dateAdded).fromNow()}
									</span>
									{post.dateUpdated && (
										<span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
											Updated {moment(post.dateUpdated).fromNow()}
										</span>
									)}
								</div>
							</div>
						</div>

						<div className="hidden flex-1 items-center justify-start md:flex">
							<div className="flex flex-1 flex-row items-center">
								<div className="mr-2 flex items-center">
									<Link
										href={`/u/${post.author.username}`}
										className="block text-lg font-semibold text-slate-900 dark:text-white md:text-lg"
									>
										{post.author.name}
									</Link>
								</div>
								{post.coAuthors && post.coAuthors.length > 0 && (
									<button
										onClick={openCoAuthorModal}
										className="ml-1 inline-flex cursor-pointer items-center justify-center rounded-md bg-slate-200 px-2 py-0.5 text-sm font-semibold dark:bg-slate-800"
									>
										+{post.coAuthors.length} Co-author{post.coAuthors.length > 1 && 's'}
									</button>
								)}
							</div>
							<div className="ml-2 hidden items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 md:flex md:flex-row md:items-center md:space-x-2">
								<span>{moment(post.dateAdded).format('ll')}</span>
								{post.dateUpdated && (
									<span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
										Updated {moment(post.dateUpdated).fromNow()}
									</span>
								)}
							</div>
						</div>
					</div>

					<div className="my-5 flex flex-row items-center justify-center text-center md:mt-0 md:justify-start">
						<div className="mr-3 flex flex-row items-center">
							<BookOpenSVG className="mr-1.5 inline-block h-5 w-5 text-slate-400 dark:text-slate-500" />
							<span className="text-sm text-slate-600 dark:text-slate-400">
								{post.readingTime} min read
							</span>
						</div>
						<div className="ml-3 flex flex-row items-center">
							<HeartSVG className="mr-1.5 inline-block h-5 w-5 text-slate-400 dark:text-slate-500" />
							<span className="text-sm text-slate-600 dark:text-slate-400">
								{post.totalReactions} reactions
							</span>
						</div>
					</div>
				</div>
			</div>
			<div className="container relative mx-auto grid grid-cols-8">
				<div className="col-span-full lg:col-span-6 lg:col-start-2">
					<div ref={postContentEle}>
						<div
							className="md:prose-md prose mx-auto my-5 px-4 prose-img:mx-auto prose-img:rounded-lg dark:prose-invert lg:prose-lg prose-a:break-all prose-code:text-sm prose-blockquote:text-sm prose-p:text-sm md:prose-a:break-normal md:prose-code:text-base md:prose-blockquote:text-base md:prose-p:text-base"
							data-query="post-content"
							dangerouslySetInnerHTML={{ __html: memoizedPostContent }}
						/>
					</div>
				</div>
			</div>
			<CoAuthorsModal
				visible={isCoAuthorModalVisible}
				authors={authorsArray}
				onClose={closeCoAuthorModal}
			/>
		</Fragment>
	);
};
export default PostHeader;
