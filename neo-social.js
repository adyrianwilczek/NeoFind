/* =========================================================
   NeoFind Social
   ========================================================= */

(function () {
    "use strict";

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
        bio: "Oficjalny użytkownik NeoSocial",
        followers: 1240,
        following: 87,
        verified: false
    },

    {
        id: "demo_3",
        username: "Mati",
        handle: "mati123",
        avatar: "https://i.pravatar.cc/200?img=47",
        bio: "Hejka 👋",
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
        window.auth?.currentUser || null;

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
        let element = document.getElementById("neo-social-toast");

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

        /* =========================
           REELS
           ========================= */

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

        /* =========================
           PROFILE
           ========================= */

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

        /* =========================
           ADMIN
           ========================= */

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

        /* =========================
           MOBILE
           ========================= */

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
        }

        `;

        document.head.appendChild(style);
    }

    /* =========================================================
       HTML
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
                        🏠 Home
                    </button>

                    <button class="ns-button" data-page="reels">
                        ▶ Rolki
                    </button>

                    <button class="ns-button" data-page="search">
                        🔎 Szukaj
                    </button>

                    <button class="ns-button" data-page="create">
                        ＋ Utwórz
                    </button>

                    <button class="ns-button" data-page="profile">
                        👤 Profil
                    </button>

                    <button class="ns-button" data-page="admin">
                        🛡️ Admin
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
                🏠
            </button>

            <button class="ns-button" data-page="reels">
                ▶
            </button>

            <button class="ns-button" data-page="create">
                ＋
            </button>

            <button class="ns-button" data-page="profile">
                👤
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
            .addEventListener("click", closeSocial);
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

            console.error("NeoSocial:", error);

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
            console.error(error);
        }

        const user = currentUser();

        return {
            uid,
            email: user?.email || "",
            username: user?.displayName || "NeoUser",
            handle: "user",
            avatar: user?.photoURL || "",
            followers: 0,
            following: 0,
            verified: false,
            warnings: 0,
            banned: false
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
       HOME / FEED
       ========================================================= */

    async function renderHome(main) {

        const posts = await getDocs(NS.posts);

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

                    <h2>Witaj w NeoSocial</h2>

                    <p class="ns-muted">
                        Nie ma jeszcze żadnych postów.
                        Dodaj pierwszy post.
                    </p>

                </div>
                `
            }

        </div>
        `;

        document
            .getElementById("ns-refresh")
            ?.addEventListener("click", () =>
                render("home")
            );

        main
            .querySelectorAll("[data-delete-post]")
            .forEach(button => {

                button.addEventListener("click", () =>
                    deletePost(button.dataset.deletePost)
                );

            });

        main
            .querySelectorAll("[data-like-post]")
            .forEach(button => {

                button.addEventListener("click", () =>
                    likePost(button.dataset.likePost)
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
                    data-like-post="${post.id}">
                    ♡ ${post.likes || 0}
                </button>

                <button
                    class="ns-button"
                    onclick="
                        navigator.clipboard?.writeText(
                            location.origin +
                            '/social/post/${esc(post.id)}'
                        );

                        neoSocialToast('Link skopiowany');
                    ">
                    ↗ Udostępnij
                </button>

                ${
                    isAdmin()
                    ?
                    `
                    <button
                        class="ns-button danger"
                        data-delete-post="${post.id}">
                        🗑 Usuń
                    </button>
                    `
                    :
                    ""
                }

            </div>

        </article>

        `;
    }

    /* =========================================================
       LIKES
       ========================================================= */

    async function likePost(postId) {

        const user = currentUser();

        const db = firebaseDB();

        if (!user || !db) {

            toast("Musisz być zalogowany.");

            return;
        }

        try {

            const ref = db
                .collection(NS.likes)
                .doc(`${user.uid}_${postId}`);

            const existing = await ref.get();

            const postRef =
                db.collection(NS.posts).doc(postId);

            if (existing.exists) {

                await ref.delete();

                await postRef.update({
                    likes:
                        firebase.firestore.FieldValue.increment(-1)
                });

            } else {

                await ref.set({
                    uid: user.uid,
                    postId,
                    createdAt:
                        firebase.firestore.FieldValue.serverTimestamp()
                });

                await postRef.update({
                    likes:
                        firebase.firestore.FieldValue.increment(1)
                });

            }

            render("home");

        } catch (error) {

            console.error(error);

            toast("Nie udało się polubić posta.");

        }
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
                        Nie ma jeszcze rolek.
                    </p>

                    <button
                        class="ns-button primary"
                        onclick="neoSocialPage('create')">
                        ＋ Dodaj pierwszą
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

                button.addEventListener("click", () =>
                    likeReel(button.dataset.likeReel)
                );

            });
    }

    function renderReel(reel) {

        const publicId =
            reel.publicId || reel.id;

        return `

        <article class="ns-reel">

            ${
                reel.videoUrl
                ?
                `
                <video
                    class="ns-reel-video"
                    src="${esc(reel.videoUrl)}"
                    autoplay
                    muted
                    loop
                    playsinline>
                </video>
                `
                :
                `
                <div class="ns-reel-placeholder"></div>
                `
            }

            <div class="ns-reel-gradient"></div>

            <div class="ns-reel-info">

                <b>

                    ${esc(reel.username || "NeoUser")}

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
                    data-like-reel="${reel.id}">
                    ♡
                </button>

                <small>
                    ${reel.likes || 0}
                </small>

                <button
                    class="ns-reel-action">
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

                        neoSocialToast('Link skopiowany');
                    ">
                    ↗
                </button>

            </div>

        </article>

        `;
    }

    async function likeReel(reelId) {

        const user = currentUser();

        const db = firebaseDB();

        if (!user || !db) {

            toast("Musisz być zalogowany.");

            return;
        }

        const ref = db
            .collection(NS.likes)
            .doc(`${user.uid}_reel_${reelId}`);

        const exists =
            await ref.get();

        const reelRef =
            db.collection(NS.reels).doc(reelId);

        if (exists.exists) {

            await ref.delete();

            await reelRef.update({
                likes:
                    firebase.firestore.FieldValue.increment(-1)
            });

        } else {

            await ref.set({
                uid: user.uid,
                reelId,
                createdAt:
                    firebase.firestore.FieldValue.serverTimestamp()
            });

            await reelRef.update({
                likes:
                    firebase.firestore.FieldValue.increment(1)
            });

        }

        render("reels");
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

                    <h2>Zaloguj się</h2>

                    <p class="ns-muted">
                        Musisz być zalogowany, aby publikować.
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

                    <h2>Twoje konto jest zablokowane</h2>

                    <p class="ns-muted">
                        Nie możesz obecnie publikować
                        w NeoSocial.
                    </p>

                </div>

            </div>

            `;

            return;
        }

        main.innerHTML = `

        <div class="ns-feed">

            <h1>Utwórz</h1>

            <div class="ns-card">

                <h3>Nowy post</h3>

                <textarea
                    id="ns-post-text"
                    class="ns-textarea"
                    placeholder="Co słychać?">
                </textarea>

                <input
                    id="ns-post-image"
                    class="ns-input"
                    style="margin-top:10px"
                    placeholder="URL zdjęcia (opcjonalnie)"
                >

                <button
                    id="ns-publish-post"
                    class="ns-button primary"
                    style="margin-top:10px">
                    Opublikuj post
                </button>

            </div>

            <div class="ns-card">

                <h3>Nowa rolka</h3>

                <input
                    id="ns-reel-file"
                    type="file"
                    accept="video/*"
                >

                <textarea
                    id="ns-reel-caption"
                    class="ns-textarea"
                    style="margin-top:10px"
                    placeholder="Opis rolki">
                </textarea>

                <button
                    id="ns-publish-reel"
                    class="ns-button primary"
                    style="margin-top:10px">
                    Opublikuj rolkę
                </button>

            </div>

        </div>

        `;

        document
            .getElementById("ns-publish-post")
            .addEventListener("click", publishPost);

        document
            .getElementById("ns-publish-reel")
            .addEventListener("click", publishReel);
    }

    async function publishPost() {

        const user = currentUser();

        const db = firebaseDB();

        if (!user || !db) return;

        const profile =
            await getProfile(user.uid);

        if (profile.banned) {

            toast("Nie możesz publikować.");

            return;
        }

        const text =
            document
                .getElementById("ns-post-text")
                .value
                .trim();

        const imageUrl =
            document
                .getElementById("ns-post-image")
                .value
                .trim();

        if (!text && !imageUrl) {

            toast("Dodaj tekst lub zdjęcie.");

            return;
        }

        try {

            await db.collection(NS.posts).add({

                uid: user.uid,

                email: user.email,

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
                    firebase.firestore.FieldValue
                        .serverTimestamp()

            });

            toast("Post opublikowany.");

            render("home");

        } catch (error) {

            console.error(error);

            toast("Nie udało się opublikować.");

        }
    }

    async function publishReel() {

        const user = currentUser();

        const db = firebaseDB();

        const storage =
            firebaseStorage();

        if (!user || !db || !storage) {

            toast("Firebase Storage nie jest dostępny.");

            return;
        }

        const profile =
            await getProfile(user.uid);

        if (profile.banned) {

            toast("Nie możesz publikować.");

            return;
        }

        const file =
            document
                .getElementById("ns-reel-file")
                .files[0];

        if (!file) {

            toast("Wybierz film.");

            return;
        }

        try {

            toast("Przesyłanie rolki...");

            const publicId =
                "NF-R-" +
                Math.random()
                    .toString(36)
                    .slice(2,10)
                    .toUpperCase();

            const ref =
                storage
                    .ref(
                        `social/reels/${user.uid}/${Date.now()}-${file.name}`
                    );

            await ref.put(file);

            const videoUrl =
                await ref.getDownloadURL();

            const caption =
                document
                    .getElementById("ns-reel-caption")
                    .value
                    .trim();

            await db.collection(NS.reels).add({

                uid: user.uid,

                email: user.email,

                username:
                    profile.username ||
                    "NeoUser",

                handle:
                    profile.handle ||
                    "user",

                avatar:
                    profile.avatar ||
                    "",

                verified:
                    !!profile.verified,

                videoUrl,

                caption,

                publicId,

                likes: 0,

                comments: 0,

                createdAt:
                    firebase.firestore.FieldValue
                        .serverTimestamp()

            });

            toast("Rolka opublikowana.");

            render("reels");

        } catch (error) {

            console.error(error);

            toast("Nie udało się przesłać rolki.");

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

                    <h2>Zaloguj się</h2>

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
                        "Użytkownik NeoFind"
                    )}

                </p>

                <div class="ns-profile-stats">

                    <div class="ns-profile-stat">

                        <strong>
                            ${profile.followers || 0}
                        </strong>

                        <span>
                            Obserwujących
                        </span>

                    </div>

                    <div class="ns-profile-stat">

                        <strong>
                            ${profile.following || 0}
                        </strong>

                        <span>
                            Obserwowanych
                        </span>

                    </div>

                </div>

            </div>

        </div>

        `;
    }

    /* =========================================================
       SEARCH
       ========================================================= */

    function renderSearch(main) {

        main.innerHTML = `

        <div class="ns-feed">

            <h1>Szukaj</h1>

            <input
                id="ns-search-input"
                class="ns-input"
                placeholder="@username lub nazwa użytkownika"
            >

            <div id="ns-search-results"></div>

        </div>

        `;

        document
            .getElementById("ns-search-input")
            .addEventListener(
                "input",
                searchUsers
            );
    }

    async function searchUsers(event) {

        const query =
            event.target.value
                .trim()
                .toLowerCase();

        const result =
            document.getElementById(
                "ns-search-results"
            );

        if (!query) {

            result.innerHTML = "";

            return;
        }

        const profiles =
            await getDocs(NS.profiles);

        const filtered =
            profiles.filter(profile =>

                String(
                    profile.username || ""
                )
                .toLowerCase()
                .includes(query)

                ||

                String(
                    profile.handle || ""
                )
                .toLowerCase()
                .includes(query)

            );

        result.innerHTML =
            filtered.map(profile => `

                <div class="ns-card ns-row">

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

            `).join("");

    }

    /* =========================================================
       ADMIN
       ========================================================= */

    async function renderAdmin(main) {

        if (!isAdmin()) {

            main.innerHTML = `

            <div class="ns-feed">

                <div class="ns-card">

                    <h2>Brak dostępu</h2>

                    <p class="ns-muted">
                        Ta sekcja jest dostępna tylko
                        dla administratorów NeoFind.
                    </p>

                </div>

            </div>

            `;

            return;
        }

        const profiles =
            await getDocs(NS.profiles);

        const posts =
            await getDocs(NS.posts);

        const reels =
            await getDocs(NS.reels);

        main.innerHTML = `

        <div class="ns-feed">

            <h1>NeoSocial Admin</h1>

            <div class="ns-admin-grid">

                <div class="ns-stat">

                    Użytkownicy

                    <strong>
                        ${profiles.length}
                    </strong>

                </div>

                <div class="ns-stat">

                    Posty

                    <strong>
                        ${posts.length}
                    </strong>

                </div>

                <div class="ns-stat">

                    Rolki

                    <strong>
                        ${reels.length}
                    </strong>

                </div>

            </div>

            <div class="ns-card">

                <h3>Zweryfikuj użytkownika</h3>

                <input
                    id="ns-verify-email"
                    class="ns-input"
                    placeholder="Email użytkownika"
                >

                <button
                    id="ns-verify"
                    class="ns-button primary"
                    style="margin-top:10px">
                    ✓ Zweryfikuj
                </button>

            </div>

            <div class="ns-card">

                <h3>Moderacja użytkowników</h3>

                ${
                    profiles.map(renderAdminUser).join("")
                }

            </div>

        </div>

        `;

        document
            .getElementById("ns-verify")
            .addEventListener(
                "click",
                verifyByEmail
            );

        main
            .querySelectorAll("[data-warning]")
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
            .querySelectorAll("[data-ban]")
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

                    </b>

                    <div class="ns-muted">

                        ${esc(
                            profile.email ||
                            ""
                        )}

                    </div>

                    <div class="ns-muted">

                        Ostrzeżenia:
                        ${profile.warnings || 0}/3

                        ·

                        ${
                            profile.banned
                            ?
                            "ZBANOWANY"
                            :
                            "aktywny"
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

                    ⚠ Ostrzeżenie

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
                        "Odblokuj"
                        :
                        "Zbanuj"
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

        const email =
            document
                .getElementById(
                    "ns-verify-email"
                )
                .value
                .trim()
                .toLowerCase();

        if (!email) {

            toast("Podaj email.");

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

                toast("Nie znaleziono użytkownika.");

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

            toast("Użytkownik zweryfikowany.");

            render("admin");

        } catch (error) {

            console.error(error);

            toast("Błąd weryfikacji.");

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

                toast("Nie znaleziono użytkownika.");

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

            /*
             * 3 warnings = automatic ban
             */

            if (warnings >= 3) {

                update.banned = true;

                update.banReason =
                    "Automatyczny ban po 3 ostrzeżeniach.";

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

            if (warnings >= 3) {

                toast(
                    "3 ostrzeżenia. Użytkownik został zbanowany."
                );

            } else {

                toast(
                    `Ostrzeżenie ${warnings}/3`
                );

            }

            render("admin");

        } catch (error) {

            console.error(error);

            toast("Nie udało się nadać ostrzeżenia.");

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
                    "Decyzja administratora."
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
                "Użytkownik zbanowany."
                :
                "Użytkownik odblokowany."
            );

            render("admin");

        } catch (error) {

            console.error(error);

            toast("Błąd moderacji.");

        }
    }

    /* =========================================================
       DELETE POST
       ========================================================= */

    async function deletePost(postId) {

        if (!isAdmin()) return;

        const db =
            firebaseDB();

        if (!confirm(
            "Czy na pewno chcesz usunąć ten post?"
        )) return;

        try {

            await db
                .collection(NS.posts)
                .doc(postId)
                .delete();

            toast("Post usunięty.");

            render("home");

        } catch (error) {

            console.error(error);

            toast("Nie udało się usunąć posta.");

        }
    }

    /* =========================================================
       PUBLIC API
       ========================================================= */

    window.neoSocialToast = toast;

    window.neoSocialPage = render;

    window.openNeoSocial = function () {

        createRoot();

        injectCSS();

        const root =
            document.getElementById(NS.root);

        root.classList.add("ns-open");

        render("home");
    };

    window.closeNeoSocial =
        closeSocial;

})();
