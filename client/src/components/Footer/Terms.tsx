import React from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface TermsProps {
  embedded?: boolean;
}

export default function Terms({ embedded = false }: TermsProps) {
  return (
    <Box sx={{ width: '100%', mt: embedded ? 0 : 0 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Barta Community Code of Conduct
      </Typography>

      <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
        Our commitment to respectful engagement
      </Typography>

      <Typography variant="body1" sx={{ mb: 2 }}>
        Barta exists to help neighbors trade what they have for what they need.
        That only works if members treat each other with good judgment and
        respect.
      </Typography>

      <Typography variant="body1" sx={{ mb: 3 }}>
        This Code of Conduct sets the ground rules for everyone participating
        in the Barta community.
      </Typography>

      <Typography variant="h5" sx={{ mb: 1 }}>
        Mission statement:
      </Typography>

      <Typography variant="body1" sx={{ mb: 1 }}>
        Barta is a free peer-to-peer website where individuals post personal
        property or services they want to barter. We:
      </Typography>

      <Box component="ul" sx={{ mt: 1, mb: 2 }}>
        <li>charge no fees</li>
        <li>process no payments</li>
        <li>issue no credits or virtual currency</li>
        <li>take no possession of property</li>
        <li>assign no value to trades</li>
      </Box>

      <Typography variant="body1" sx={{ mb: 4 }}>
        Our purpose as a platform is to provide tools that allow users to connect and
        arrange trades on their own terms while encouraging user safety and responsibility.
        {' '}
        Barta opens access to a wider range of valuable resources, and to more people
        than would otherwise be possible. We encourage you to take the initiative in
        connecting and cultivating real community in your neighborhood.
      </Typography>

      <Typography variant="h5" sx={{ mb: 1 }}>
        1. Respectful and Courteous Behavior
      </Typography>

      <Typography variant="body1" sx={{ mb: 1 }}>
        Barta is built to be welcoming and inclusive. As a member, you&apos;re
        responsible for upholding decent, respectful behavior in every
        interaction. We ask that you would treat each other with kindness and
        empathy, and to make sure what you post is appropriate for all
        audiences.
      </Typography>

      <Typography variant="body1">Do not post:</Typography>
      <Box component="ul" sx={{ mt: 1, mb: 2 }}>
        <li>
          {' '}
          Illegal Content: Anything prohibited by applicable law.
          This includes but is not limited to: stolen goods, counterfeit goods,
          illegal drugs/controlled substances, prescription drugs, hazardous
          materials, recalled or unsafe products, sexual services, anything
          related to trafficking/exploitation, and content involving sexual
          exploitation of minors. Barta may report suspected illegal activity
          to law enforcement or other appropriate authorities when required by
          law or when Barta determines that reporting is appropriate.
        </li>
        <li>
          Sexually Explicit Content: Art is allowed on Barta, but we do not allow
          explicit pornography.
          Sexually explicit content of any kind should not be sent to other users
          in DMs, comments, or through posting- nor are sexual favors permitted
          as an acceptable service for trade. We have a zero-tolerance policy for
          sexual content involving minors, non-consensual intimate imagery, and
          sexual exploitation/trafficking.
        </li>
        <li>
          {' '}
          Harassment: Targeted harassment or abusive behavior aimed at either a specific
          individual or particular group of people.
          {' '}
        </li>
        <li>
          Violence: Imagery or other depictions of excessive violence of any sort, or glorification
          of that violence. While hunters and fishing enthusiasts may barter lawful
          catches or related goods, weapons of any sort are strictly prohibited.
        </li>
        <li>
          {' '}
          Scams, Fraud, or Shady Business Tactics: Use of Barta to solicit, cold call, or recruit
          users for other businesses, side projects, hustles. This extends to trying to take
          advantage of users in any way, shape or form- whether it be profiting off their free
          labor, an attempted scam, or a business/individual trying to hire on our app.
        </li>
        <li>
          {' '}
          Stolen or Unowned Content: Do not upload, offer, or trade content that either is a stolen
          good or infringes another person&apos;s copyright, trademark, or other
          intellectual-property rights. You must own the content or have
          sufficient permission or legal rights to use and trade it.
        </li>
      </Box>

      <Typography variant="body1" sx={{ mb: 4 }}>
        Respectful, courteous behavior keeps Barta vibrant and supportive.
        Everyone should be able to trade, learn, and connect with confidence.
      </Typography>

      <Typography variant="h5" sx={{ mb: 1 }}>
        2. Protecting Your Privacy
      </Typography>

      <Typography variant="body1" sx={{ mb: 1 }}>
        Protecting your privacy is your responsibility. Help us help you by being aware
        of the following.
      </Typography>

      <Typography variant="body1" sx={{ mb: 1 }}>
        Users should exercise caution when executing trades. We recommend:
      </Typography>

      <Box component="ul" sx={{ mt: 1, mb: 2 }}>
        <li>
          Sharing only information you are comfortable providing to other users.
        </li>
        <li>
          When a trade requires a meetup, meeting in a public area during the day, such as:
          <Box component="ul" sx={{ mt: 1 }}>
            <li>a local bookstore</li>
            <li>a coffee shop</li>
            <li>a farmer&apos;s market</li>
            <li>an art market</li>
            <li>or even by a police station</li>
          </Box>
        </li>
      </Box>

      <Typography variant="body1" sx={{ mb: 1 }}>
        On your profile, you have the ability to:
      </Typography>

      <Box component="ul" sx={{ mt: 1, mb: 2 }}>
        <li>hide your own trade history, but not reviews</li>
        <li>hide your personal email</li>
        <li>edit your bio, profile picture, or profile background at any time</li>
      </Box>

      <Typography variant="body1" sx={{ mb: 1 }}>
        On your profile or on your feed, you can:
      </Typography>

      <Box component="ul" sx={{ mt: 1, mb: 2 }}>
        <li>
          edit or delete any post that is not tied to a completed trade. Completed
          trades exist within trade history, which can be hidden
        </li>
      </Box>

      <Typography variant="body1" sx={{ mb: 1 }}>
        On any post you comment on, you have:
      </Typography>

      <Box component="ul" sx={{ mt: 1, mb: 2 }}>
        <li>the ability to delete your comment</li>
      </Box>

      <Typography variant="body1" sx={{ mb: 1 }}>
        Regarding your location:
      </Typography>

      <Box component="ul" sx={{ mt: 1, mb: 2 }}>
        <li>
          while we ask for a general location so you can place posts within a postal
          code, we do not sell any of the data you provide, including location data.
          We also do not share your location data with other users. You can change
          your location to another valid postal code and country at any time
        </li>
      </Box>

      <Typography variant="body1" sx={{ mb: 1 }}>
        We also offer:
      </Typography>

      <Box component="ul" sx={{ mt: 1, mb: 4 }}>
        <li>a reporting system</li>
        <li>the ability to block users, should you wish or require it</li>
      </Box>

      <Typography variant="h5" sx={{ mb: 1 }}>
        3. Intentional Contributions
      </Typography>

      <Typography variant="body1" sx={{ mb: 1 }}>
        You&apos;ll get the most out of Barta by being intentional. Engage with
        neighbors and posts that interest you. Give back by answering
        questions and sharing your experience.
      </Typography>

      <Box component="ul" sx={{ mt: 1, mb: 2 }}>
        <li>
          Include clear photos with every barter listing. Images should clearly
          depict the item offered
        </li>
        <li>Offer helpful, constructive feedback to other members</li>
        <li>
          Leave thoughtful comments on listings and topics that interest you
        </li>
      </Box>

      <Typography variant="body1" sx={{ mb: 4 }}>
        Users are responsible for evaluating listings, determining the condition
        and value of property or services, negotiating trade terms, and deciding
        whether to complete an exchange. Barta does not inspect, authenticate, value,
        or guarantee items or services offered by users. For digital-art trades,
        Barta may facilitate the delivery of digital files upon completion of a trade.
        Barta does not take ownership of those files, determine their value, or guarantee
        their authenticity or legal ownership. Users are responsible for determining
        and complying with any tax obligations arising from their trades.
      </Typography>

      <Typography variant="h5" sx={{ mb: 1 }}>
        4. Best Practices for Barter Listings
      </Typography>

      <Typography variant="body1" sx={{ mb: 1 }}>
        Barta works because listings clearly communicate what&apos;s on offer
        and what&apos;s being asked for. Clear, honest listings are what make a
        good trade possible.
      </Typography>

      <Box component="ul" sx={{ mt: 1, mb: 2 }}>
        <li>
          Describe the item or service accurately, including its condition
        </li>
        <li>
          Use real photos of the item you wish to trade – not stock images or
          photos of a different unit
        </li>
        <li>Disclose known defects or limitations up front</li>
        <li>
          Do not upload, offer, or trade content that infringes another person&apos;s copyright,
          trademark, or other intellectual-property rights. You must own the content or have
          sufficient permission or legal rights to use and trade it. Additionally, when offering
          digital content for trade, you represent that you own the content or have sufficient
          rights to distribute and transfer it through Barta.
        </li>
      </Box>

      <Typography variant="body1" sx={{ mb: 4 }}>
        Accurate listings are what make trades trustworthy. When members can
        rely on a listing being honest, everyone trades with more confidence.
      </Typography>

      <Typography variant="h5" sx={{ mb: 1 }}>
        5. Responsible Use of Community Features
      </Typography>

      <Typography variant="body1" sx={{ mb: 1 }}>
        Barta includes features to help members interact, including private
        messaging. Use these tools responsibly, and don&apos;t spam or send
        unsolicited messages.
      </Typography>

      <Typography variant="body1">We consider the following to be spam:</Typography>

      <Box component="ul" sx={{ mt: 1, mb: 2 }}>
        <li>
          Using likes, comments, private messages, or other features to draw
          attention to your profile in a disingenuous way
        </li>
        <li>
          Misusing community features for personal gain, or in a way that
          doesn&apos;t match their intended purpose
        </li>
        <li>
          Leaving irrelevant comments just to draw attention to your account
        </li>
        <li>
          Posting content that explicitly promotes an unrelated product or
          service
        </li>
        <li>
          Posting the same question in multiple places before anyone&apos;s
          had a chance to reply
        </li>
      </Box>

      <Typography variant="body1" sx={{ mb: 4 }}>
        Using community features responsibly keeps Barta a place where members
        can engage with each other meaningfully.
      </Typography>

      <Typography variant="h5" sx={{ mb: 1 }}>
        6. Private Messaging for Community Building
      </Typography>

      <Typography variant="body1" sx={{ mb: 1 }}>
        Private messaging is a powerful way to connect and collaborate with
        other members.
      </Typography>

      <Box component="ul" sx={{ mt: 1, mb: 2 }}>
        <li>Keep messages relevant and on-topic</li>
        <li>
          Personalize your messages. A boilerplate message feels impersonal
          and rarely gives the recipient enough context to respond. Mention
          something specific to them and explain why you are reaching out
        </li>
        <li>
          Have a specific reason, trade, or opportunity in mind before
          messaging someone. Avoid generic &quot;want to collaborate?&quot;
          messages
        </li>
      </Box>

      <Typography variant="body1" sx={{ mb: 4 }}>
        Responsible, community-minded messaging builds the connections and
        partnerships that help everyone on Barta grow.
      </Typography>

      <Typography variant="h5" sx={{ mb: 1 }}>
        7. Reporting Violations
      </Typography>

      <Typography variant="body1" sx={{ mb: 1 }}>
        If you see a post or comment that violates this Code of Conduct, please
        report it.
      </Typography>

      <Box component="ul" sx={{ mt: 1, mb: 2 }}>
        <li>Select Report on the post, comment or DM in question</li>
        <li>
          Describe the issue and include any relevant details or evidence, such
          as a link to the post, a screenshot, etc.
        </li>
        <li>
          Barta&apos;s moderation team will review the report and take
          appropriate action
        </li>
      </Box>

      <Typography variant="body1" sx={{ mb: 4 }}>
        8. Barta reserves the right to remove content, restrict access to platform
        features, or take other appropriate action in response to violations of
        this Code of Conduct.
      </Typography>

      <Typography variant="h5" sx={{ mb: 1 }}>
        Contact
      </Typography>

      <Typography variant="body1">
        Questions or concerns? Reach out to Barta&apos;s support team
        {' '}
        with any bugs, feedback or for business related reasons
        <a href="/contact"> here</a>
        . To appeal moderation actions, please fill out an appeal
        <a href="/help"> here.</a>
        {' '}
        Feel free to check out Barta&apos;s
        {' '}
        <a
          href="https://github.com/Sleeper-and-the-Insomniacs/thesis-barter-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub repository
        </a>
        {' '}
        for additional information.
      </Typography>
    </Box>
  );
}
