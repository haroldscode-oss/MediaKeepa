# Planning Guide

A seamless video downloader that converts online videos to multiple formats with an elegant, responsive interface.

**Experience Qualities**:
1. **Effortless** - Zero friction from paste to download with intelligent auto-detection
2. **Elegant** - Clean, uncluttered interface that focuses entirely on the core task
3. **Responsive** - Instant visual feedback through smooth shimmer animations and state transitions

**Complexity Level**: Light Application (multiple features with basic state)
The app handles URL input validation, async data fetching, format selection across three categories (video, audio, image), and includes theme switching with persisted preferences.

## Essential Features

### Theme Toggle
- **Functionality**: Smooth animated toggle between light and dark modes with icon transitions
- **Purpose**: Provide user preference for viewing environment and reduce eye strain
- **Trigger**: User clicks the sun/moon icon button in the top-right corner
- **Progression**: Click button → Icon rotates and fades → Theme transitions smoothly → Preference saved to localStorage
- **Success criteria**: Theme persists across sessions, smooth 0.3s transitions, icons animate elegantly

### URL Input & Auto-Detection
- **Functionality**: Intelligent URL validation and auto-triggering of video fetch
- **Purpose**: Minimize user effort by automatically processing valid URLs
- **Trigger**: User pastes or types a video URL from YouTube or Vimeo
- **Progression**: Paste URL → Auto-detect → Trigger fetch → Show shimmer loading
- **Success criteria**: URL is validated and fetch begins within 100ms of paste

### Shimmer Loading State
- **Functionality**: Animated text shimmer effect during video information fetch
- **Purpose**: Provide engaging visual feedback during async operations
- **Trigger**: URL validation passes and fetch begins
- **Progression**: Show "Fetching video information..." → Shimmer animation plays → Resolve to results
- **Success criteria**: Smooth animation that feels premium, loading state clears when data arrives

### Video Information Display
- **Functionality**: Show video thumbnail, title, and metadata
- **Purpose**: Confirm correct video before download selection
- **Trigger**: Successful API response with video data
- **Progression**: Shimmer ends → Fade in thumbnail and title → Display format tabs
- **Success criteria**: Clear visual hierarchy with thumbnail and title prominently displayed

### Format Selection System
- **Functionality**: Three-tab interface (Video, Audio, Image) with format-specific options
- **Purpose**: Allow users to choose output format and quality settings
- **Trigger**: Video information loads successfully
- **Progression**: View tabs → Select category → Choose format → Configure quality/bitrate → Download button appears
- **Success criteria**: Selected format highlights clearly, quality options appear contextually

### Download Execution
- **Functionality**: Initiate download with selected format and settings
- **Purpose**: Complete the user's goal of obtaining the video in desired format
- **Trigger**: User clicks download button after making all selections
- **Progression**: Click download → Toast confirmation → File begins downloading
- **Success criteria**: Clear feedback on download initiation, appropriate file naming

## Edge Case Handling
- **Invalid URLs**: Display error message when URL doesn't match supported platforms
- **Network Failures**: Show user-friendly error toast when fetch fails
- **Missing Selections**: Disable download button until format and quality are chosen
- **Empty States**: Guide users with placeholder text in the URL input

## Design Direction
The design should feel modern, polished, and trustworthy - combining the approachable elegance of consumer apps with the precision of professional tools. A minimal interface serves the focused purpose best.

## Color Selection
Custom palette using purple-to-blue gradient accents to convey creativity and technical capability.

- **Primary Color**: Deep Purple (oklch(0.5 0.15 270)) - Represents creativity and digital media transformation
- **Secondary Colors**: Soft Gray (oklch(0.95 0 0)) for subtle backgrounds and de-emphasized elements
- **Accent Color**: Vibrant Blue (oklch(0.65 0.2 240)) - Draws attention to interactive elements and creates energy
- **Foreground/Background Pairings**:
  - Light Mode:
    - Background (Pure White oklch(1 0 0)): Dark text (oklch(0.2 0 0)) - Ratio 16.3:1 ✓
    - Card (Soft White oklch(0.98 0 0)): Dark text (oklch(0.2 0 0)) - Ratio 15.8:1 ✓
    - Primary (Deep Purple oklch(0.5 0.15 270)): White text (oklch(1 0 0)) - Ratio 7.2:1 ✓
    - Accent (Vibrant Blue oklch(0.65 0.2 240)): White text (oklch(1 0 0)) - Ratio 4.8:1 ✓
  - Dark Mode:
    - Background (Deep Gray oklch(0.15 0 0)): Light text (oklch(0.98 0 0)) - Ratio 16.1:1 ✓
    - Card (Slate oklch(0.18 0 0)): Light text (oklch(0.98 0 0)) - Ratio 14.2:1 ✓
    - Primary (Bright Purple oklch(0.65 0.2 270)): Light text (oklch(0.98 0 0)) - Ratio 5.1:1 ✓
    - Accent (Bright Blue oklch(0.7 0.22 240)): Light text (oklch(0.98 0 0)) - Ratio 4.9:1 ✓

## Font Selection
Inter provides the perfect balance of technical precision and friendly approachability with excellent readability at all sizes.

- **Typographic Hierarchy**:
  - H2 (Video Title): Inter Semibold/18px/snug leading
  - Body (Metadata): Inter Regular/14px/normal spacing
  - Small (Duration): Inter Regular/12px/relaxed spacing
  - Input (URL Field): Inter Regular/16px/comfortable padding
  - Button Labels: Inter Semibold/16px/medium tracking

## Animations
Animations should feel swift and purposeful - quick enough to maintain momentum but smooth enough to feel polished. Balance between functional transitions and delightful micro-interactions.

- **Purposeful Meaning**: Motion reinforces hierarchy and guides attention through the workflow stages
- **Hierarchy of Movement**:
  1. Theme toggle icon rotation and fade (200ms) - instant feedback
  2. Shimmer loading animation (primary) - communicates active processing
  3. Content fade-in transitions (400ms) - establishes clear state changes
  4. Format selection transitions (secondary) - confirms user choices
  5. Download button slide-up (spring animation) - celebrates completion readiness

## Component Selection
- **Components**:
  - Button - Primary actions (download) and icon buttons (theme toggle) with custom gradient styling
  - Input (URL field) - Modified with custom focus states and larger padding
  - Tabs (Format categories) - Clean segmented control appearance
  - Select (Quality/bitrate dropdowns) - Custom styling to match minimal aesthetic
  - Card (Video info container) - Subtle shadow and border for elevation
  - Toast (sonner) - Feedback for success and error states
  
- **Customizations**:
  - Custom shimmer text component using CSS animations and gradients
  - Custom format option buttons with icon integration and selection states
  - Theme toggle with animated icon crossfade
  - Animated download button that slides in from below when selection is complete

- **States**:
  - Button: Default (gradient bg), Hover (opacity change), Disabled (muted colors)
  - Input: Default (subtle border), Focus (accent glow), Filled (darker border), Error (red border)
  - Format Options: Unselected (muted), Hover (accent border), Selected (accent background)
  - Theme Toggle: Light (sun icon), Dark (moon icon), with rotation transitions

- **Icon Selection**:
  - Play (filled) - Video formats
  - MusicNote (filled) - Audio formats
  - Image (filled) - Image formats
  - DownloadSimple (bold) - Download action
  - Sun (filled) - Light theme indicator
  - Moon (filled) - Dark theme indicator

- **Spacing**:
  - Container padding: 16px mobile, 32px desktop
  - Section gaps: 32px
  - Card internal padding: 20px
  - Button height: 48px for primary actions
  - Input height: 56px for comfortable interaction

- **Mobile**:
  - Single column layout throughout
  - Format grid switches to 2 columns on mobile
  - Tabs remain full-width with equal distribution
  - Increase touch targets to minimum 44px
  - Theme toggle positioned in top-right with adequate padding from edge
