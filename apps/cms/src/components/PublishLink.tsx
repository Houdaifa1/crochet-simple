import Link from 'next/link';

export function PublishLink() {
  return (
    <Link className="cs-nav-publish" href="/admin#publish">
      Publish the website
    </Link>
  );
}
