/* =========================================================
   NeoFind Social
   Fully English version
   ========================================================= */

(function () {
    "use strict";

   /* =========================
   ADMIN EMAILS
========================= */
const OWNER_EMAILS = [
    "adrian.wilczek@hotmail.com"
]
    
const ADMIN_EMAILS = [
    "adrian.wilczek@hotmail.com",
    "michal.szyszynski@outlook.com",
    "Michal.szyszynski@outlook.com",
    "account.neofind@gmail.com",
    "support.neofind@gmail.com",
    "Michal.wilkowski@outlook.com",
    "michal.wilkowski@gmail.com",
    "j.e.wilkowska@gmail.com"
];

    const NS = {
        root: "neo-social-root",
        profiles: "socialProfiles",
        posts: "socialPosts",
        reels: "socialReels",
        follows: "socialFollows",
        likes: "socialLikes",
        comments: "socialComments",
        moderation: "socialModeration"
    };

    const DEMO_PROFILES = [
        {
            id: "demo_1",
            username: "NeoUser",
            handle: "neouser",
            avatar: "https://i.pravatar.cc/200?img=12",
            bio: "Official NeoSocial user",
            followers: 1240,
            following: 87,
            verified: false
        },
        {
            id: "demo_3",
            username: "Mati",
            handle: "mati123",
            avatar: "https://i.pravatar.cc/200?img=47",
            bio: "Hello!",
            followers: 321,
            following: 64,
            verified: false
        }
    ];

    /* =========================================================
       HELPERS
       ========================================================= */

    const esc = (value) =>
        String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char]));

    const currentUser = () =>
        window.auth?.currentUser ||
        window.firebase?.auth?.().currentUser ||
        null;

    const firebaseDB = () =>
        window.db || null;

    const firebaseStorage = () =>
        window.storage || null;

    function isAdmin() {
        const user = currentUser();

        if (!user?.email) return false;

        const email = user.email.toLowerCase();

        const admins = [
            ...(window.ADMIN_EMAILS || []),
            ...(window.OWNER_EMAILS || [])
        ];

        return admins
            .map(String)
            .map(x => x.toLowerCase())
            .includes(email);
    }

    function toast(message) {
        let element =
            document.getElementById("neo-social-toast");

        if (!element) {
            element = document.createElement("div");
            element.id = "neo-social-toast";
            document.body.appendChild(element);
        }

        element.textContent = message;
        element.classList.add("show");

        clearTimeout(element._timer);

        element._timer = setTimeout(() => {
            element.classList.remove("show");
        }, 2200);
    }

    function closeSocial() {
        document
            .getElementById(NS.root)
            ?.classList.remove("ns-open");
    }

    function getFirebase() {
        if (!window.firebase) return null;

        if (
            !window.firebase.firestore ||
            !window.firebase.storage
        ) {
            return null;
        }

        return window.firebase;
    }

    /* =========================================================
       CSS
       ========================================================= */

    function injectCSS() {
        if (document.getElementById("neo-social-css")) return;

        const style = document.createElement("style");

        style.id = "neo-social-css";

        style.textContent = `

        #${NS.root}{
            position:fixed;
            inset:0;
            z-index:99990;
            background:#070d11;
            color:#fff;
            font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
            display:none;
            overflow:hidden;
        }

        #${NS.root}.ns-open{
            display:block;
        }

        .ns-layout{
            display:flex;
            width:100%;
            height:100%;
        }

        .ns-sidebar{
            width:240px;
            flex-shrink:0;
            background:#091419;
            border-right:1px solid #193239;
            padding:22px 16px;
            box-sizing:border-box;
        }

        .ns-logo{
            font-size:24px;
            font-weight:800;
            margin-bottom:25px;
        }

        .ns-logo span{
            color:#00e0b5;
        }

        .ns-nav{
            display:grid;
            gap:8px;
        }

        .ns-nav button{
            width:100%;
            text-align:left;
        }

        .ns-main{
            flex:1;
            overflow:auto;
            min-width:0;
        }

        .ns-feed{
            width:min(700px,100%);
            margin:auto;
            padding:25px 15px 90px;
            box-sizing:border-box;
        }

        .ns-card{
            background:#0c1a20;
            border:1px solid #1b343c;
            border-radius:18px;
            padding:16px;
            margin:12px 0;
            box-sizing:border-box;
        }

        .ns-row{
            display:flex;
            align-items:center;
            gap:11px;
        }

        .ns-avatar{
            width:45px;
            height:45px;
            border-radius:50%;
            object-fit:cover;
            background:#17343c;
            flex-shrink:0;
        }

        .ns-avatar-large{
            width:92px;
            height:92px;
        }

        .ns-muted{
            color:#78939b;
            font-size:13px;
        }

        .ns-button{
            border:1px solid #25434b;
            background:#10242b;
            color:#fff;
            border-radius:11px;
            padding:9px 13px;
            cursor:pointer;
            transition:.15s;
        }

        .ns-button:hover{
            background:#173139;
        }

        .ns-button.primary{
            background:#00b991;
            border-color:#00b991;
            color:#03100d;
            font-weight:700;
        }

        .ns-button.danger{
            background:#3a171c;
            border-color:#733039;
        }

        .ns-input,
        .ns-textarea{
            width:100%;
            box-sizing:border-box;
            border:1px solid #25434b;
            background:#071216;
            color:#fff;
            border-radius:12px;
            padding:12px;
            outline:none;
        }

        .ns-textarea{
            min-height:120px;
            resize:vertical;
        }

        .ns-input:focus,
        .ns-textarea:focus{
            border-color:#00c9a4;
        }

        .ns-topbar{
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:10px;
        }

        .ns-actions{
            display:flex;
            flex-wrap:wrap;
            gap:7px;
            margin-top:12px;
        }

        .ns-verified{
            display:inline-block;
            width:17px;
            height:17px;
            border-radius:50%;
            background:#38a9ff;
            margin-left:4px;
            position:relative;
            vertical-align:-3px;
        }

        .ns-verified::after{
            content:"";
            position:absolute;
            width:7px;
            height:4px;
            border-left:2px solid white;
            border-bottom:2px solid white;
            transform:rotate(-45deg);
            left:5px;
            top:5px;
        }

        .ns-post-image{
            display:block;
            width:100%;
            max-height:650px;
            object-fit:cover;
            border-radius:15px;
            margin-top:13px;
        }

        .ns-comments{
            margin-top:12px;
            border-top:1px solid #1b343c;
            padding-top:12px;
        }

        .ns-comment{
            display:flex;
            gap:9px;
            padding:9px 0;
            border-bottom:1px solid #142a31;
        }

        .ns-comment:last-child{
            border-bottom:0;
        }

        .ns-comment-avatar{
            width:34px;
            height:34px;
            border-radius:50%;
            object-fit:cover;
            flex-shrink:0;
        }

        .ns-comment-body{
            flex:1;
            min-width:0;
        }

        .ns-comment-text{
            margin-top:3px;
            word-break:break-word;
        }

        .ns-comment-form{
            display:flex;
            gap:7px;
            margin-top:10px;
        }

        .ns-comment-form input{
            flex:1;
        }

        .ns-reels{
            width:100%;
            height:100%;
            overflow-y:auto;
            scroll-snap-type:y mandatory;
        }

        .ns-reel{
            height:100vh;
            max-width:600px;
            margin:auto;
            position:relative;
            scroll-snap-align:start;
            overflow:hidden;
            background:#050a0d;
        }

        .ns-reel-video{
            position:absolute;
            inset:0;
            width:100%;
            height:100%;
            object-fit:cover;
            background:#000;
        }

        .ns-reel-placeholder{
            position:absolute;
            inset:0;
            background:
                radial-gradient(
                    circle at 20% 20%,
                    #00d9b0,
                    transparent 30%
                ),
                radial-gradient(
                    circle at 80% 75%,
                    #355fff,
                    transparent 35%
                ),
                #080f12;
        }

        .ns-reel-gradient{
            position:absolute;
            inset:0;
            background:linear-gradient(
                transparent 45%,
                rgba(0,0,0,.9)
            );
            pointer-events:none;
        }

        .ns-reel-info{
            position:absolute;
            left:18px;
            right:90px;
            bottom:25px;
            z-index:5;
        }

        .ns-reel-actions{
            position:absolute;
            right:12px;
            bottom:25px;
            z-index:6;
            display:grid;
            gap:5px;
            justify-items:center;
        }

        .ns-reel-action{
            width:50px;
            height:50px;
            border-radius:50%;
            border:1px solid #ffffff25;
            background:#0009;
            color:white;
            font-size:21px;
            cursor:pointer;
        }

        .ns-reel-id{
            color:#78939b;
            font-size:11px;
            margin-top:8px;
        }

        .ns-volume{
            position:absolute;
            right:15px;
            top:15px;
            z-index:8;
        }

        .ns-profile-head{
            text-align:center;
        }

        .ns-profile-stats{
            display:flex;
            justify-content:center;
            gap:35px;
            margin-top:20px;
        }

        .ns-profile-stat strong{
            display:block;
            font-size:21px;
        }

        .ns-profile-stat span{
            color:#78939b;
            font-size:12px;
        }

        .ns-profile-edit{
            text-align:left;
            margin-top:20px;
        }

        .ns-admin-grid{
            display:grid;
            grid-template-columns:repeat(3,1fr);
            gap:10px;
        }

        .ns-stat{
            background:#0c1a20;
            border:1px solid #1b343c;
            border-radius:15px;
            padding:15px;
        }

        .ns-stat strong{
            display:block;
            font-size:23px;
            margin-top:5px;
        }

        .ns-mobile-nav{
            display:none;
        }

        #neo-social-toast{
            position:fixed;
            z-index:100001;
            left:50%;
            bottom:25px;
            transform:translateX(-50%);
            background:#14272e;
            border:1px solid #31525b;
            color:white;
            padding:12px 18px;
            border-radius:12px;
            display:none;
        }

        #neo-social-toast.show{
            display:block;
        }

        @media(max-width:700px){

            .ns-sidebar{
                display:none;
            }

            .ns-mobile-nav{
                display:flex;
                position:fixed;
                z-index:100000;
                bottom:0;
                left:0;
                right:0;
                height:64px;
                background:#081419;
                border-top:1px solid #19343b;
                justify-content:space-around;
                align-items:center;
            }

            .ns-mobile-nav .ns-button{
                border:0;
                background:transparent;
                font-size:18px;
            }

            .ns-admin-grid{
                grid-template-columns:1fr 1fr;
            }

            .ns-comment-form{
                flex-direction:column;
            }
        }

        `;

        document.head.appendChild(style);
    }

    /* =========================================================
       HTML ROOT
       ========================================================= */

    function createRoot() {
        if (document.getElementById(NS.root)) return;

        const root = document.createElement("div");

        root.id = NS.root;

        root.innerHTML = `

        <div class="ns-layout">

            <aside class="ns-sidebar">

                <div class="ns-logo">
                    Neo<span>Social</span>
                </div>

                <div class="ns-nav">

                    <button class="ns-button" data-page="home">
                        Home
                    </button>

                    <button class="ns-button" data-page="reels">
                        Reels
                    </button>

                    <button class="ns-button" data-page="search">
                        Search
                    </button>

                    <button class="ns-button" data-page="create">
                        + Create
                    </button>

                    <button class="ns-button" data-page="profile">
                        Profile
                    </button>

                    <button class="ns-button" data-page="admin">
                        Admin
                    </button>

                    <button class="ns-button" id="ns-close">
                        ← NeoFind
                    </button>

                </div>

            </aside>

            <main class="ns-main" id="ns-main"></main>

        </div>

        <nav class="ns-mobile-nav">

            <button class="ns-button" data-page="home">
                Home
            </button>

            <button class="ns-button" data-page="reels">
                Reels
            </button>

            <button class="ns-button" data-page="create">
                +
            </button>

            <button class="ns-button" data-page="profile">
                Profile
            </button>

        </nav>

        `;

        document.body.appendChild(root);

        root.querySelectorAll("[data-page]").forEach(button => {
            button.addEventListener("click", () => {
                render(button.dataset.page);
            });
        });

        root.querySelector("#ns-close")
            ?.addEventListener("click", closeSocial);
    }

    /* =========================================================
       FIREBASE
       ========================================================= */

    async function getDocs(collection) {
        const db = firebaseDB();

        if (!db) return [];

        try {
            const result = await db
                .collection(collection)
                .orderBy("createdAt", "desc")
                .limit(50)
                .get();

            return result.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

        } catch (error) {
            console.error(
                `NeoSocial: unable to fetch ${collection}`,
                error
            );

            return [];
        }
    }

    async function getProfile(uid) {
        const db = firebaseDB();

        if (!db || !uid) return {};

        try {
            const doc = await db
                .collection(NS.profiles)
                .doc(uid)
                .get();

            if (doc.exists) {
                return {
                    uid,
                    ...doc.data()
                };
            }

        } catch (error) {
            console.error(
                "NeoSocial profile:",
                error
            );
        }

        const user = currentUser();

        return {
            uid,
            email: user?.email || "",
            username: user?.displayName || "NeoUser",
            handle: "user",
            avatar: user?.photoURL || "",
            bio: "NeoFind user",
            followers: 0,
            following: 0,
            verified: false,
            warnings: 0,
            banned: false
        };
    }

    async function ensureProfile() {
        const user = currentUser();
        const db = firebaseDB();

        if (!user || !db) return null;

        const ref =
            db.collection(NS.profiles).doc(user.uid);

        const snap = await ref.get();

        if (!snap.exists) {
            const profile = {
                uid: user.uid,
                email: user.email || "",
                username:
                    user.displayName ||
                    "NeoUser",
                handle:
                    (user.email || "user")
                        .split("@")[0]
                        .replace(/[^a-zA-Z0-9_]/g, "")
                        .slice(0, 20) ||
                    "user",
                avatar:
                    user.photoURL || "",
                bio:
                    "NeoFind user",
                followers: 0,
                following: 0,
                verified: false,
                warnings: 0,
                banned: false,
                createdAt:
                    firebase.firestore.FieldValue
                        .serverTimestamp()
            };

            await ref.set(profile);

            return profile;
        }

        return {
            uid: user.uid,
            ...snap.data()
        };
    }

    /* =========================================================
       ROUTER
       ========================================================= */

    async function render(page = "home") {
        createRoot();
        injectCSS();

        const main =
            document.getElementById("ns-main");

        if (!main) return;

        if (page === "home")
            return renderHome(main);

        if (page === "reels")
            return renderReels(main);

        if (page === "create")
            return renderCreate(main);

        if (page === "profile")
            return renderProfile(main);

        if (page === "search")
            return renderSearch(main);

        if (page === "admin")
            return renderAdmin(main);

        return renderHome(main);
    }

    /* =========================================================
       HOME
       ========================================================= */

    async function renderHome(main) {
        const posts =
            await getDocs(NS.posts);

        main.innerHTML = `

        <div class="ns-feed">

            <div class="ns-topbar">

                <h1>NeoFind Social</h1>

                <button
                    class="ns-button"
                    id="ns-refresh">
                    ↻
                </button>

            </div>

            ${
                posts.length
                ?
                posts.map(renderPost).join("")
                :
                `
                <div class="ns-card">

                    <h2>Welcome to NeoSocial</h2>

                    <p class="ns-muted">
                        There are no posts yet.
                    </p>

                </div>
                `
            }

        </div>

        `;

        document
            .getElementById("ns-refresh")
            ?.addEventListener(
                "click",
                () => render("home")
            );

        main
            .querySelectorAll("[data-delete-post]")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () =>
                        deletePost(
                            button.dataset.deletePost
                        )
                );
            });

        main
            .querySelectorAll("[data-like-post]")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () =>
                        likePost(
                            button.dataset.likePost
                        )
                );
            });

        main
            .querySelectorAll("[data-comments-post]")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () =>
                        togglePostComments(
                            button.dataset.commentsPost
                        )
                );
            });
    }

    function renderPost(post) {
        return `

        <article class="ns-card">

            <div class="ns-row">

                <img
                    class="ns-avatar"
                    src="${esc(
                        post.avatar ||
                        "https://i.pravatar.cc/100?img=12"
                    )}"
                >

                <div>

                    <b>
                        ${esc(post.username || "NeoUser")}

                        ${
                            post.verified
                            ?
                            `<span class="ns-verified"></span>`
                            :
                            ""
                        }
                    </b>

                    <div class="ns-muted">
                        @${esc(post.handle || "user")}
                    </div>

                </div>

            </div>

            <p>
                ${esc(post.text || "")}
            </p>

            ${
                post.imageUrl
                ?
                `
                <img
                    class="ns-post-image"
                    src="${esc(post.imageUrl)}"
                >
                `
                :
                ""
            }

            <div class="ns-actions">

                <button
                    class="ns-button"
                    data-like-post="${esc(post.id)}">
                    ♡ ${post.likes || 0}
                </button>

                <button
                    class="ns-button"
                    data-comments-post="${esc(post.id)}">
                    💬 Comments
                </button>

                <button
                    class="ns-button"
                    onclick="
                        navigator.clipboard?.writeText(
                            location.origin +
                            '/social/post/${esc(post.id)}'
                        );
                        neoSocialToast('Link copied');
                    ">
                    ↗ Share
                </button>

                ${
                    isAdmin()
                    ?
                    `
                    <button
                        class="ns-button danger"
                        data-delete-post="${esc(post.id)}">
                        Delete
                    </button>
                    `
                    :
                    ""
                }

            </div>

            <div
                id="ns-post-comments-${esc(post.id)}"
                class="ns-comments"
                style="display:none">
            </div>

        </article>

        `;
    }

    /* =========================================================
       POST LIKES
       ========================================================= */

    async function likePost(postId) {
        const user = currentUser();
        const db = firebaseDB();

        if (!user || !db) {
            toast("You must be logged in.");
            return;
        }

        try {
            const ref = db
                .collection(NS.likes)
                .doc(`${user.uid}_${postId}`);

            const existing =
                await ref.get();

            const postRef =
                db.collection(NS.posts)
                    .doc(postId);

            if (existing.exists) {
                await ref.delete();

                await postRef.update({
                    likes:
                        firebase.firestore
                            .FieldValue
                            .increment(-1)
                });

            } else {
                await ref.set({
                    uid: user.uid,
                    postId,
                    type: "post",
                    createdAt:
                        firebase.firestore
                            .FieldValue
                            .serverTimestamp()
                });

                await postRef.update({
                    likes:
                        firebase.firestore
                            .FieldValue
                            .increment(1)
                });
            }

            render("home");

        } catch (error) {
            console.error(error);
            toast("Could not like the post.");
        }
    }

    /* =========================================================
       POST COMMENTS
       ========================================================= */

    async function togglePostComments(postId) {
        const box =
            document.getElementById(
                `ns-post-comments-${postId}`
            );

        if (!box) return;

        if (box.style.display === "block") {
            box.style.display = "none";
            return;
        }

        box.style.display = "block";

        await renderComments(
            box,
            "post",
            postId
        );
    }

    /* =========================================================
       REELS
       ========================================================= */

    async function renderReels(main) {
        const reels =
            await getDocs(NS.reels);

        main.innerHTML = `

        <section class="ns-reels">

        ${
            reels.length
            ?
            reels.map(renderReel).join("")
            :
            `
            <article class="ns-reel">

                <div class="ns-reel-placeholder"></div>

                <div class="ns-reel-gradient"></div>

                <div class="ns-reel-info">

                    <h2>NeoSocial Reels</h2>

                    <p>
                        There are no reels yet.
                    </p>

                    <button
                        class="ns-button primary"
                        onclick="neoSocialPage('create')">
                        + Add the first one
                    </button>

                </div>

            </article>
            `
        }

        </section>
        `;

        main
            .querySelectorAll("[data-like-reel]")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () =>
                        likeReel(
                            button.dataset.likeReel
                        )
                );
            });

        main
            .querySelectorAll("[data-comments-reel]")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () =>
                        openReelComments(
                            button.dataset.commentsReel
                        )
                );
            });

        main
            .querySelectorAll("[data-volume-reel]")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () =>
                        toggleReelSound(
                            button.dataset.volumeReel,
                            button
                        )
                );
            });

        setupReelVideos(main);
    }

    function renderReel(reel) {
        const publicId =
            reel.publicId || reel.id;

        return `

        <article
            class="ns-reel"
            data-reel="${esc(reel.id)}">

            ${
                reel.videoUrl
                ?
                `
                <video
                    id="ns-video-${esc(reel.id)}"
                    class="ns-reel-video"
                    src="${esc(reel.videoUrl)}"
                    autoplay
                    muted
                    loop
                    playsinline
                    preload="metadata">
                </video>
                `
                :
                `
                <div class="ns-reel-placeholder"></div>
                `
            }

            <button
                class="ns-reel-action ns-volume"
                data-volume-reel="${esc(reel.id)}">
                🔇
            </button>

            <div class="ns-reel-gradient"></div>

            <div class="ns-reel-info">

                <b>

                    ${esc(
                        reel.username ||
                        "NeoUser"
                    )}

                    ${
                        reel.verified
                        ?
                        `<span class="ns-verified"></span>`
                        :
                        ""
                    }

                </b>

                <div class="ns-muted">
                    @${esc(reel.handle || "user")}
                </div>

                <p>
                    ${esc(reel.caption || "")}
                </p>

                <div class="ns-reel-id">
                    neofind.pl/social/reel/${esc(publicId)}
                </div>

            </div>

            <div class="ns-reel-actions">

                <button
                    class="ns-reel-action"
                    data-like-reel="${esc(reel.id)}">
                    ♡
                </button>

                <small>
                    ${reel.likes || 0}
                </small>

                <button
                    class="ns-reel-action"
                    data-comments-reel="${esc(reel.id)}">
                    💬
                </button>

                <small>
                    ${reel.comments || 0}
                </small>

                <button
                    class="ns-reel-action"
                    onclick="
                        navigator.clipboard?.writeText(
                            location.origin +
                            '/social/reel/${esc(publicId)}'
                        );
                        neoSocialToast('Link copied');
                    ">
                    ↗
                </button>

            </div>

        </article>
        `;
    }

    function setupReelVideos(main) {
        const videos =
            main.querySelectorAll(
                ".ns-reel-video"
            );

        videos.forEach(video => {
            video.muted = true;

            video.play().catch(() => {});

            video.addEventListener(
                "click",
                () => {
                    if (video.paused) {
                        video.play().catch(() => {});
                    } else {
                        video.pause();
                    }
                }
            );
        });

        if ("IntersectionObserver" in window) {
            const observer =
                new IntersectionObserver(
                    entries => {
                        entries.forEach(entry => {
                            const video =
                                entry.target;

                            if (entry.isIntersecting) {
                                document
                                    .querySelectorAll(
                                        ".ns-reel-video"
                                    )
                                    .forEach(other => {
                                        if (other !== video) {
                                            other.pause();
                                        }
                                    });

                                video.play()
                                    .catch(() => {});

                            } else {
                                video.pause();
                            }
                        });
                    },
                    {
                        threshold: 0.7
                    }
                );

            videos.forEach(video =>
                observer.observe(video)
            );
        }
    }

    function toggleReelSound(
        reelId,
        button
    ) {
        const video =
            document.getElementById(
                `ns-video-${reelId}`
            );

        if (!video) return;

        video.muted = !video.muted;

        button.textContent =
            video.muted
            ? "🔇"
            : "🔊";

        if (!video.muted) {
            video.play().catch(() => {});
        }
    }

    async function likeReel(reelId) {
        const user = currentUser();
        const db = firebaseDB();

        if (!user || !db) {
            toast("You must be logged in.");
            return;
        }

        try {
            const ref =
                db.collection(NS.likes)
                    .doc(
                        `${user.uid}_reel_${reelId}`
                    );

            const exists =
                await ref.get();

            const reelRef =
                db.collection(NS.reels)
                    .doc(reelId);

            if (exists.exists) {
                await ref.delete();

                await reelRef.update({
                    likes:
                        firebase.firestore
                            .FieldValue
                            .increment(-1)
                });

            } else {
                await ref.set({
                    uid: user.uid,
                    reelId,
                    type: "reel",
                    createdAt:
                        firebase.firestore
                            .FieldValue
                            .serverTimestamp()
                });

                await reelRef.update({
                    likes:
                        firebase.firestore
                            .FieldValue
                            .increment(1)
                });
            }

            render("reels");

        } catch (error) {
            console.error(error);

            toast(
                "Could not like the reel."
            );
        }
    }

    async function openReelComments(reelId) {
        const comments =
            await getComments(
                "reel",
                reelId
            );

        const reel =
            document.querySelector(
                `[data-reel="${CSS.escape(reelId)}"]`
            );

        if (!reel) return;

        let old =
            reel.querySelector(
                ".ns-reel-comments-overlay"
            );

        if (old) {
            old.remove();
            return;
        }

        const overlay =
            document.createElement("div");

        overlay.className =
            "ns-reel-comments-overlay";

        overlay.style.cssText = `
            position:absolute;
            z-index:20;
            left:10px;
            right:10px;
            bottom:10px;
            max-height:55%;
            overflow:auto;
            background:#081419f5;
            border:1px solid #25434b;
            border-radius:18px;
            padding:15px;
        `;

        overlay.innerHTML = `

            <div class="ns-topbar">

                <b>Comments</b>

                <button
                    class="ns-button"
                    data-close-comments>
                    ×
                </button>

            </div>

            <div class="ns-comments-list">

                ${
                    comments.length
                    ?
                    comments
                        .map(renderComment)
                        .join("")
                    :
                    `
                    <p class="ns-muted">
                        No comments yet.
                    </p>
                    `
                }

            </div>

            <div class="ns-comment-form">

                <input
                    class="ns-input"
                    data-reel-comment-input
                    placeholder="Write a comment..."
                >

                <button
                    class="ns-button primary"
                    data-add-reel-comment>
                    Send
                </button>

            </div>
        `;

        reel.appendChild(overlay);

        overlay
            .querySelector("[data-close-comments]")
            ?.addEventListener(
                "click",
                () => overlay.remove()
            );

        overlay
            .querySelector("[data-add-reel-comment]")
            ?.addEventListener(
                "click",
                async () => {
                    const input =
                        overlay.querySelector(
                            "[data-reel-comment-input]"
                        );

                    await addComment(
                        "reel",
                        reelId,
                        input?.value || ""
                    );

                    overlay.remove();

                    await updateReelCommentCount(
                        reelId
                    );

                    render("reels");
                }
            );

        overlay
            .querySelectorAll("[data-delete-comment]")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    async () => {
                        await deleteComment(
                            button.dataset.deleteComment
                        );

                        openReelComments(
                            reelId
                        );
                    }
                );
            });
    }

    /* =========================================================
       COMMENTS SYSTEM
       ========================================================= */

    async function getComments(
        type,
        targetId
    ) {
        const db = firebaseDB();

        if (!db) return [];

        try {
            const result =
                await db
                    .collection(NS.comments)
                    .where("type", "==", type)
                    .where("targetId", "==", targetId)
                    .limit(100)
                    .get();

            return result.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .sort(
                    (a, b) =>
                        getTimestamp(a.createdAt) -
                        getTimestamp(b.createdAt)
                );

        } catch (error) {
            console.error(
                "NeoSocial comments:",
                error
            );

            return [];
        }
    }

    function getTimestamp(value) {
        if (!value) return 0;

        if (
            typeof value.toMillis ===
            "function"
        ) {
            return value.toMillis();
        }

        if (value.seconds) {
            return value.seconds * 1000;
        }

        return 0;
    }

    function renderComment(comment) {
        const user =
            currentUser();

        const canDelete =
            isAdmin() ||
            user?.uid === comment.uid;

        return `

        <div class="ns-comment">

            <img
                class="ns-comment-avatar"
                src="${esc(
                    comment.avatar ||
                    "https://i.pravatar.cc/100?img=12"
                )}"
            >

            <div class="ns-comment-body">

                <b>
                    ${esc(
                        comment.username ||
                        "NeoUser"
                    )}

                    ${
                        comment.verified
                        ?
                        `<span class="ns-verified"></span>`
                        :
                        ""
                    }
                </b>

                <div class="ns-comment-text">
                    ${esc(
                        comment.text || ""
                    )}
                </div>

                ${
                    canDelete
                    ?
                    `
                    <button
                        class="ns-button danger"
                        style="margin-top:5px;padding:5px 8px;font-size:11px"
                        data-delete-comment="${esc(comment.id)}">
                        Delete
                    </button>
                    `
                    :
                    ""
                }

            </div>

        </div>

        `;
    }

    async function renderComments(
        box,
        type,
        targetId
    ) {
        const comments =
            await getComments(
                type,
                targetId
            );

        const user =
            currentUser();

        box.innerHTML = `

            <div class="ns-comments-list">

                ${
                    comments.length
                    ?
                    comments
                        .map(renderComment)
                        .join("")
                    :
                    `
                    <p class="ns-muted">
                        No comments yet.
                    </p>
                    `
                }

            </div>

            ${
                user
                ?
                `
                <div class="ns-comment-form">

                    <input
                        class="ns-input"
                        id="ns-comment-input-${esc(targetId)}"
                        placeholder="Write a comment..."
                    >

                    <button
                        class="ns-button primary"
                        id="ns-comment-send-${esc(targetId)}">
                        Send
                    </button>

                </div>
                `
                :
                `
                <p class="ns-muted">
                    Log in to comment.
                </p>
                `
            }

        `;

        box
            .querySelector(
                `#ns-comment-send-${CSS.escape(targetId)}`
            )
            ?.addEventListener(
                "click",
                async () => {
                    const input =
                        document.getElementById(
                            `ns-comment-input-${targetId}`
                        );

                    await addComment(
                        type,
                        targetId,
                        input?.value || ""
                    );

                    await renderComments(
                        box,
                        type,
                        targetId
                    );
                }
            );

        box
            .querySelectorAll(
                "[data-delete-comment]"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    async () => {
                        await deleteComment(
                            button.dataset.deleteComment
                        );

                        await renderComments(
                            box,
                            type,
                            targetId
                        );
                    }
                );
            });
    }

    async function addComment(
        type,
        targetId,
        text
    ) {
        const user = currentUser();
        const db = firebaseDB();

        if (!user || !db) {
            toast("You must be logged in.");
            return false;
        }

        text =
            String(text || "")
                .trim();

        if (!text) {
            toast(
                "Comment cannot be empty."
            );

            return false;
        }

        if (text.length > 500) {
            toast(
                "Comment can contain a maximum of 500 characters."
            );

            return false;
        }

        try {
            const profile =
                await getProfile(
                    user.uid
                );

            await db
                .collection(NS.comments)
                .add({
                    uid: user.uid,

                    email:
                        user.email || "",

                    username:
                        profile.username ||
                        user.displayName ||
                        "NeoUser",

                    handle:
                        profile.handle ||
                        "user",

                    avatar:
                        profile.avatar ||
                        user.photoURL ||
                        "",

                    verified:
                        !!profile.verified,

                    type,

                    targetId,

                    text,

                    createdAt:
                        firebase.firestore
                            .FieldValue
                            .serverTimestamp()
                });

            if (type === "reel") {
                await db
                    .collection(NS.reels)
                    .doc(targetId)
                    .update({
                        comments:
                            firebase.firestore
                                .FieldValue
                                .increment(1)
                    });
            }

            toast("Comment added.");

            return true;

        } catch (error) {
            console.error(
                "NeoSocial comment:",
                error
            );

            toast(
                "Could not add the comment."
            );

            return false;
        }
    }

    async function deleteComment(
        commentId
    ) {
        const user = currentUser();
        const db = firebaseDB();

        if (!user || !db) return;

        try {
            const ref =
                db
                    .collection(NS.comments)
                    .doc(commentId);

            const snap =
                await ref.get();

            if (!snap.exists) return;

            const comment =
                snap.data();

            if (
                comment.uid !== user.uid &&
                !isAdmin()
            ) {
                toast(
                    "You cannot delete this comment."
                );

                return;
            }

            await ref.delete();

            if (
                comment.type === "reel"
            ) {
                try {
                    await db
                        .collection(NS.reels)
                        .doc(comment.targetId)
                        .update({
                            comments:
                                firebase.firestore
                                    .FieldValue
                                    .increment(-1)
                        });

                } catch (error) {
                    console.warn(
                        "Could not update the comment counter.",
                        error
                    );
                }
            }

            toast("Comment deleted.");

        } catch (error) {
            console.error(error);

            toast(
                "Could not delete the comment."
            );
        }
    }

    async function updateReelCommentCount() {
        return;
    }

    /* =========================================================
       CREATE
       ========================================================= */

    async function renderCreate(main) {
        const user = currentUser();

        if (!user) {
            main.innerHTML = `

            <div class="ns-feed">

                <div class="ns-card">

                    <h2>Log in</h2>

                    <p class="ns-muted">
                        You must be logged in to publish.
                    </p>

                </div>

            </div>

            `;

            return;
        }

        const profile =
            await getProfile(user.uid);

        if (profile.banned) {
            main.innerHTML = `

            <div class="ns-feed">

                <div class="ns-card">

                    <h2>Account banned</h2>

                    <p class="ns-muted">
                        You cannot currently post on NeoSocial.
                    </p>

                </div>

            </div>

            `;

            return;
        }

        main.innerHTML = `

        <div class="ns-feed">

            <h1>Create</h1>

            <div class="ns-card">

                <h3>New post</h3>

                <textarea
                    id="ns-post-text"
                    class="ns-textarea"
                    placeholder="What's on your mind?">
                </textarea>

                <input
                    id="ns-post-image"
                    class="ns-input"
                    style="margin-top:10px"
                    placeholder="Image URL (optional)"
                >

                <button
                    id="ns-publish-post"
                    class="ns-button primary"
                    style="margin-top:10px">
                    Publish post
                </button>

            </div>

            <div class="ns-card">

                <h3>New reel</h3>

                <input
                    id="ns-reel-file"
                    type="file"
                    class="ns-input"
                    accept="video/*"
                >

                <textarea
                    id="ns-reel-caption"
                    class="ns-textarea"
                    style="margin-top:10px"
                    placeholder="Reel description">
                </textarea>

                <button
                    id="ns-publish-reel"
                    class="ns-button primary"
                    style="margin-top:10px">
                    Publish reel
                </button>

            </div>

        </div>
        `;

        document
            .getElementById("ns-publish-post")
            ?.addEventListener(
                "click",
                publishPost
            );

        document
            .getElementById("ns-publish-reel")
            ?.addEventListener(
                "click",
                publishReel
            );
    }

    async function publishPost() {
        const user = currentUser();
        const db = firebaseDB();

        if (!user || !db) {
            toast("You must be logged in.");
            return;
        }

        const profile =
            await getProfile(user.uid);

        if (profile.banned) {
            toast("You cannot publish.");
            return;
        }

        const textElement =
            document.getElementById(
                "ns-post-text"
            );

        const imageElement =
            document.getElementById(
                "ns-post-image"
            );

        const text =
            textElement?.value
                ?.trim() || "";

        const imageUrl =
            imageElement?.value
                ?.trim() || "";

        if (!text && !imageUrl) {
            toast(
                "Add text or an image."
            );

            return;
        }

        try {
            await db
                .collection(NS.posts)
                .add({
                    uid: user.uid,

                    email:
                        user.email || "",

                    username:
                        profile.username ||
                        user.displayName ||
                        "NeoUser",

                    handle:
                        profile.handle ||
                        "user",

                    avatar:
                        profile.avatar ||
                        user.photoURL ||
                        "",

                    verified:
                        !!profile.verified,

                    text,

                    imageUrl,

                    likes: 0,

                    createdAt:
                        firebase.firestore
                            .FieldValue
                            .serverTimestamp()
                });

            toast(
                "Post published."
            );

            render("home");

        } catch (error) {
            console.error(error);

            toast(
                "Could not publish the post."
            );
        }
    }

    async function publishReel() {
        const user = currentUser();
        const db = firebaseDB();
        const storage = firebaseStorage();

        if (!user) {
            toast(
                "You must be logged in."
            );

            return;
        }

        if (!db) {
            toast(
                "Firestore is unavailable."
            );

            return;
        }

        if (!storage) {
            toast(
                "Firebase Storage is unavailable."
            );

            return;
        }

        const profile =
            await getProfile(user.uid);

        if (profile.banned) {
            toast(
                "You cannot publish."
            );

            return;
        }

        const fileInput =
            document.getElementById(
                "ns-reel-file"
            );

        const captionInput =
            document.getElementById(
                "ns-reel-caption"
            );

        if (!fileInput) {
            toast(
                "Video input was not found."
            );

            return;
        }

        const file =
            fileInput.files?.[0];

        if (!file) {
            toast(
                "Choose a video."
            );

            return;
        }

        if (
            !file.type.startsWith("video/")
        ) {
            toast(
                "The selected file is not a video."
            );

            return;
        }

        /* Maximum file size: 100 MB */

        if (
            file.size >
            100 * 1024 * 1024
        ) {
            toast(
                "The video can be up to 100 MB."
            );

            return;
        }

        const caption =
            captionInput?.value
                ?.trim() || "";

        try {
            toast(
                "Uploading reel..."
            );

            const publicId =
                "NF-R-" +
                Math.random()
                    .toString(36)
                    .slice(2, 10)
                    .toUpperCase();

            const safeName =
                file.name
                    .replace(
                        /[^a-zA-Z0-9._-]/g,
                        "_"
                    );

            const ref =
                storage.ref(
                    `social/reels/${user.uid}/${Date.now()}-${safeName}`
                );

            await ref.put(
                file,
                {
                    contentType:
                        file.type
                }
            );

            const videoUrl =
                await ref.getDownloadURL();

            await db
                .collection(NS.reels)
                .add({
                    uid: user.uid,

                    email:
                        user.email || "",

                    username:
                        profile.username ||
                        user.displayName ||
                        "NeoUser",

                    handle:
                        profile.handle ||
                        "user",

                    avatar:
                        profile.avatar ||
                        user.photoURL ||
                        "",

                    verified:
                        !!profile.verified,

                    videoUrl,

                    caption,

                    publicId,

                    likes: 0,

                    comments: 0,

                    createdAt:
                        firebase.firestore
                            .FieldValue
                            .serverTimestamp()
                });

            toast(
                "Reel published."
            );

            render("reels");

        } catch (error) {
            console.error(
                "NeoSocial publishReel:",
                error
            );

            toast(
                "Could not upload the reel."
            );
        }
    }

    /* =========================================================
       PROFILE
       ========================================================= */

    async function renderProfile(main) {
        const user = currentUser();

        if (!user) {
            main.innerHTML = `

            <div class="ns-feed">

                <div class="ns-card">

                    <h2>Log in</h2>

                </div>

            </div>

            `;

            return;
        }

        const profile =
            await getProfile(user.uid);

        main.innerHTML = `

        <div class="ns-feed">

            <div class="ns-card ns-profile-head">

                <img
                    id="ns-profile-avatar-preview"
                    class="ns-avatar ns-avatar-large"
                    src="${esc(
                        profile.avatar ||
                        user.photoURL ||
                        "https://i.pravatar.cc/200?img=12"
                    )}"
                >

                <h2>

                    ${esc(
                        profile.username ||
                        "NeoUser"
                    )}

                    ${
                        profile.verified
                        ?
                        `<span class="ns-verified"></span>`
                        :
                        ""
                    }

                </h2>

                <div class="ns-muted">
                    @${esc(
                        profile.handle ||
                        "user"
                    )}
                </div>

                <p>
                    ${esc(
                        profile.bio ||
                        "NeoFind user"
                    )}
                </p>

                <div class="ns-profile-stats">

                    <div class="ns-profile-stat">

                        <strong>
                            ${profile.followers || 0}
                        </strong>

                        <span>
                            Followers
                        </span>

                    </div>

                    <div class="ns-profile-stat">

                        <strong>
                            ${profile.following || 0}
                        </strong>

                        <span>
                            Following
                        </span>

                    </div>

                </div>

            </div>

            <div class="ns-card ns-profile-edit">

                <h3>Edit profile</h3>

                <label>
                    Name
                </label>

                <input
                    id="ns-edit-username"
                    class="ns-input"
                    value="${esc(
                        profile.username ||
                        "NeoUser"
                    )}"
                    maxlength="40"
                >

                <label style="display:block;margin-top:10px">
                    @Handle
                </label>

                <input
                    id="ns-edit-handle"
                    class="ns-input"
                    value="${esc(
                        profile.handle ||
                        "user"
                    )}"
                    maxlength="25"
                >

                <label style="display:block;margin-top:10px">
                    Bio
                </label>

                <textarea
                    id="ns-edit-bio"
                    class="ns-textarea"
                    maxlength="160"
                    style="min-height:80px"
                >${esc(
                    profile.bio ||
                    ""
                )}</textarea>

                <label
                    style="display:block;margin-top:10px">
                    Profile picture
                </label>

                <input
                    id="ns-edit-avatar"
                    class="ns-input"
                    type="file"
                    accept="image/*"
                >

                <button
                    id="ns-save-profile"
                    class="ns-button primary"
                    style="margin-top:12px">
                    Save profile
                </button>

            </div>

        </div>

        `;

        const avatarInput =
            document.getElementById(
                "ns-edit-avatar"
            );

        avatarInput?.addEventListener(
            "change",
            () => {
                const file =
                    avatarInput.files?.[0];

                if (!file) return;

                if (
                    !file.type.startsWith("image/")
                ) {
                    toast(
                        "Choose an image."
                    );

                    return;
                }

                const url =
                    URL.createObjectURL(
                        file
                    );

                const preview =
                    document.getElementById(
                        "ns-profile-avatar-preview"
                    );

                if (preview) {
                    preview.src = url;
                }
            }
        );

        document
            .getElementById(
                "ns-save-profile"
            )
            ?.addEventListener(
                "click",
                saveProfile
            );
    }

    async function saveProfile() {
        const user = currentUser();
        const db = firebaseDB();
        const storage = firebaseStorage();

        if (!user || !db) {
            toast(
                "You must be logged in."
            );

            return;
        }

        const username =
            document
                .getElementById(
                    "ns-edit-username"
                )
                ?.value
                ?.trim();

        const handle =
            document
                .getElementById(
                    "ns-edit-handle"
                )
                ?.value
                ?.trim()
                ?.replace(/^@/, "")
                ?.toLowerCase();

        const bio =
            document
                .getElementById(
                    "ns-edit-bio"
                )
                ?.value
                ?.trim();

        const avatarFile =
            document
                .getElementById(
                    "ns-edit-avatar"
                )
                ?.files?.[0];

        if (!username) {
            toast(
                "Username is required."
            );

            return;
        }

        if (!handle) {
            toast(
                "Handle is required."
            );

            return;
        }

        if (
            !/^[a-zA-Z0-9_]+$/.test(handle)
        ) {
            toast(
                "Handle can only contain letters, numbers and _."
            );

            return;
        }

        if (username.length > 40) {
            toast(
                "Username is too long."
            );

            return;
        }

        if (handle.length > 25) {
            toast(
                "Handle is too long."
            );

            return;
        }

        try {
            toast(
                "Saving profile..."
            );

            const profileRef =
                db
                    .collection(NS.profiles)
                    .doc(user.uid);

            let avatarUrl = null;

            if (avatarFile) {
                if (
                    !avatarFile.type.startsWith(
                        "image/"
                    )
                ) {
                    toast(
                        "The selected file is not an image."
                    );

                    return;
                }

                if (
                    avatarFile.size >
                    5 * 1024 * 1024
                ) {
                    toast(
                        "Avatar can be up to 5 MB."
                    );

                    return;
                }

                if (!storage) {
                    toast(
                        "Firebase Storage is unavailable."
                    );

                    return;
                }

                const safeName =
                    avatarFile.name
                        .replace(
                            /[^a-zA-Z0-9._-]/g,
                            "_"
                        );

                const avatarRef =
                    storage.ref(
                        `social/avatars/${user.uid}/${Date.now()}-${safeName}`
                    );

                await avatarRef.put(
                    avatarFile,
                    {
                        contentType:
                            avatarFile.type
                    }
                );

                avatarUrl =
                    await avatarRef
                        .getDownloadURL();
            }

            const update = {
                username,

                handle,

                bio:
                    bio || "",

                updatedAt:
                    firebase.firestore
                        .FieldValue
                        .serverTimestamp()
            };

            if (avatarUrl) {
                update.avatar =
                    avatarUrl;
            }

            await profileRef.set(
                update,
                {
                    merge: true
                }
            );

            toast(
                "Profile saved."
            );

            render("profile");

        } catch (error) {
            console.error(
                "NeoSocial saveProfile:",
                error
            );

            toast(
                "Could not save the profile."
            );
        }
    }

    /* =========================================================
       SEARCH
       ========================================================= */

    function renderSearch(main) {
        main.innerHTML = `

        <div class="ns-feed">

            <h1>Search</h1>

            <input
                id="ns-search-input"
                class="ns-input"
                placeholder="@username or username"
            >

            <div id="ns-search-results"></div>

        </div>

        `;

        document
            .getElementById(
                "ns-search-input"
            )
            ?.addEventListener(
                "input",
                searchUsers
            );
    }

    async function searchUsers(event) {
        const query =
            event.target.value
                .trim()
                .toLowerCase()
                .replace(/^@/, "");

        const result =
            document.getElementById(
                "ns-search-results"
            );

        if (!result) return;

        if (!query) {
            result.innerHTML = "";
            return;
        }

        const profiles =
            await getDocs(
                NS.profiles
            );

        const filtered =
            profiles.filter(profile =>
                String(
                    profile.username ||
                    ""
                )
                    .toLowerCase()
                    .includes(query)

                ||

                String(
                    profile.handle ||
                    ""
                )
                    .toLowerCase()
                    .includes(query)
            );

        result.innerHTML =
            filtered.length
            ?
            filtered
                .map(profile => `

                    <div
                        class="ns-card ns-row">

                        <img
                            class="ns-avatar"
                            src="${esc(
                                profile.avatar ||
                                "https://i.pravatar.cc/100?img=12"
                            )}"
                        >

                        <div>

                            <b>

                                ${esc(
                                    profile.username ||
                                    "NeoUser"
                                )}

                                ${
                                    profile.verified
                                    ?
                                    `<span class="ns-verified"></span>`
                                    :
                                    ""
                                }

                            </b>

                            <div class="ns-muted">

                                @${esc(
                                    profile.handle ||
                                    "user"
                                )}

                            </div>

                        </div>

                    </div>

                `)
                .join("")
            :
            `
            <div class="ns-card">

                <p class="ns-muted">
                    No users found.
                </p>

            </div>
            `;
    }

    /* =========================================================
       ADMIN
       ========================================================= */

    async function renderAdmin(main) {
        if (!isAdmin()) {
            main.innerHTML = `

            <div class="ns-feed">

                <div class="ns-card">

                    <h2>Access denied</h2>

                    <p class="ns-muted">
                        This section is available only
                        to NeoFind administrators.
                    </p>

                </div>

            </div>

            `;

            return;
        }

        const profiles =
            await getDocs(
                NS.profiles
            );

        const posts =
            await getDocs(
                NS.posts
            );

        const reels =
            await getDocs(
                NS.reels
            );

        main.innerHTML = `

        <div class="ns-feed">

            <h1>NeoSocial Admin</h1>

            <div class="ns-admin-grid">

                <div class="ns-stat">
                    Users
                    <strong>
                        ${profiles.length}
                    </strong>
                </div>

                <div class="ns-stat">
                    Posts
                    <strong>
                        ${posts.length}
                    </strong>
                </div>

                <div class="ns-stat">
                    Reels
                    <strong>
                        ${reels.length}
                    </strong>
                </div>

            </div>

            <div class="ns-card">

                <h3>Verify user</h3>

                <input
                    id="ns-verify-email"
                    class="ns-input"
                    placeholder="User email"
                >

                <button
                    id="ns-verify"
                    class="ns-button primary"
                    style="margin-top:10px">
                    Verify
                </button>

            </div>

            <div class="ns-card">

                <h3>User moderation</h3>

                ${
                    profiles.length
                    ?
                    profiles
                        .map(renderAdminUser)
                        .join("")
                    :
                    `
                    <p class="ns-muted">
                        No profiles.
                    </p>
                    `
                }

            </div>

        </div>
        `;

        document
            .getElementById(
                "ns-verify"
            )
            ?.addEventListener(
                "click",
                verifyByEmail
            );

        main
            .querySelectorAll(
                "[data-warning]"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () =>
                        giveWarning(
                            button.dataset.warning
                        )
                );
            });

        main
            .querySelectorAll(
                "[data-ban]"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () =>
                        toggleBan(
                            button.dataset.ban
                        )
                );
            });
    }

    function renderAdminUser(profile) {
        return `

        <div
            class="ns-card"
            style="margin:8px 0">

            <div class="ns-row">

                <img
                    class="ns-avatar"
                    src="${esc(
                        profile.avatar ||
                        "https://i.pravatar.cc/100?img=12"
                    )}"
                >

                <div style="flex:1">

                    <b>

                        ${esc(
                            profile.username ||
                            "NeoUser"
                        )}

                        ${
                            profile.verified
                            ?
                            `<span class="ns-verified"></span>`
                            :
                            ""
                        }

                    </b>

                    <div class="ns-muted">

                        @${esc(
                            profile.handle ||
                            "user"
                        )}

                    </div>

                    <div class="ns-muted">

                        ${esc(
                            profile.email ||
                            ""
                        )}

                    </div>

                    <div class="ns-muted">

                        Warnings:
                        ${profile.warnings || 0}/3

                        ·

                        ${
                            profile.banned
                            ?
                            "BANNED"
                            :
                            "active"
                        }

                    </div>

                </div>

            </div>

            <div class="ns-actions">

                <button
                    class="ns-button"
                    data-warning="${esc(
                        profile.uid ||
                        profile.id
                    )}">
                    Warning
                </button>

                <button
                    class="ns-button danger"
                    data-ban="${esc(
                        profile.uid ||
                        profile.id
                    )}">

                    ${
                        profile.banned
                        ?
                        "Unban"
                        :
                        "Ban"
                    }

                </button>

            </div>

        </div>

        `;
    }

    /* =========================================================
       VERIFY
       ========================================================= */

    async function verifyByEmail() {
        if (!isAdmin()) return;

        const db =
            firebaseDB();

        const input =
            document.getElementById(
                "ns-verify-email"
            );

        const email =
            input?.value
                ?.trim()
                .toLowerCase();

        if (!email) {
            toast(
                "Enter an email address."
            );

            return;
        }

        try {
            const result =
                await db
                    .collection(NS.profiles)
                    .where(
                        "email",
                        "==",
                        email
                    )
                    .limit(1)
                    .get();

            if (result.empty) {
                toast(
                    "User not found."
                );

                return;
            }

            await result.docs[0]
                .ref
                .update({
                    verified: true,

                    verifiedAt:
                        firebase.firestore
                            .FieldValue
                            .serverTimestamp(),

                    verifiedBy:
                        currentUser().email
                });

            toast(
                "User verified."
            );

            render("admin");

        } catch (error) {
            console.error(error);

            toast(
                "Verification error."
            );
        }
    }

    /* =========================================================
       WARNINGS
       ========================================================= */

    async function giveWarning(uid) {
        if (!isAdmin()) return;

        const db =
            firebaseDB();

        try {
            const ref =
                db
                    .collection(NS.profiles)
                    .doc(uid);

            const snap =
                await ref.get();

            if (!snap.exists) {
                toast(
                    "User not found."
                );

                return;
            }

            const data =
                snap.data();

            const warnings =
                Number(
                    data.warnings || 0
                ) + 1;

            const update = {
                warnings
            };

            if (warnings >= 3) {
                update.banned = true;

                update.banReason =
                    "Automatic ban after 3 warnings.";

                update.bannedAt =
                    firebase.firestore
                        .FieldValue
                        .serverTimestamp();
            }

            await ref.update(update);

            await db
                .collection(NS.moderation)
                .add({
                    uid,

                    type:
                        warnings >= 3
                        ?
                        "ban"
                        :
                        "warning",

                    warningNumber:
                        warnings,

                    moderator:
                        currentUser().email,

                    createdAt:
                        firebase.firestore
                            .FieldValue
                            .serverTimestamp()
                });

            toast(
                warnings >= 3
                ?
                "3 warnings. User has been banned."
                :
                `Warning ${warnings}/3`
            );

            render("admin");

        } catch (error) {
            console.error(error);

            toast(
                "Could not issue the warning."
            );
        }
    }

    /* =========================================================
       BAN
       ========================================================= */

    async function toggleBan(uid) {
        if (!isAdmin()) return;

        const db =
            firebaseDB();

        try {
            const ref =
                db
                    .collection(NS.profiles)
                    .doc(uid);

            const snap =
                await ref.get();

            if (!snap.exists) return;

            const data =
                snap.data();

            const banned =
                !data.banned;

            await ref.update({
                banned,

                banReason:
                    banned
                    ?
                    "Administrator decision."
                    :
                    "",

                bannedAt:
                    banned
                    ?
                    firebase.firestore
                        .FieldValue
                        .serverTimestamp()
                    :
                    null
            });

            toast(
                banned
                ?
                "User banned."
                :
                "User unbanned."
            );

            render("admin");

        } catch (error) {
            console.error(error);

            toast(
                "Moderation error."
            );
        }
    }

    /* =========================================================
       DELETE POST
       ========================================================= */

    async function deletePost(postId) {
        if (!isAdmin()) return;

        const db =
            firebaseDB();

        if (
            !confirm(
                "Are you sure you want to delete this post?"
            )
        ) return;

        try {
            await db
                .collection(NS.posts)
                .doc(postId)
                .delete();

            toast(
                "Post deleted."
            );

            render("home");

        } catch (error) {
            console.error(error);

            toast(
                "Could not delete the post."
            );
        }
    }

    /* =========================================================
       PUBLIC API
       ========================================================= */

    window.neoSocialToast =
        toast;

    window.neoSocialPage =
        render;

    window.openNeoSocial =
        function () {
            createRoot();
            injectCSS();

            const root =
                document.getElementById(
                    NS.root
                );

            if (!root) return;

            root.classList.add(
                "ns-open"
            );

            render("home");
        };

    window.closeNeoSocial =
        closeSocial;

})();
