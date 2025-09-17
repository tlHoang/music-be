/* eslint-disable */
export default async () => {
  const t = {};
  return {
    '@nestjs/swagger': {
      models: [
        [
          import('./modules/users/dto/create-user.dto'),
          {
            CreateUserDto: {
              name: { required: false, type: () => String },
              email: { required: true, type: () => String, format: 'email' },
              password: { required: true, type: () => String },
              username: { required: true, type: () => String },
              phone: { required: false, type: () => String },
              address: { required: false, type: () => String },
              accountType: { required: false, type: () => String },
              role: { required: false, type: () => String },
              isActive: { required: false, type: () => Boolean },
              profilePicture: { required: false, type: () => String },
              bio: { required: false, type: () => String },
            },
          },
        ],
        [
          import('./modules/users/dto/update-user.dto'),
          {
            UpdateUserDto: {
              name: { required: false, type: () => String },
              phone: { required: false, type: () => String },
              address: { required: false, type: () => String },
              username: { required: false, type: () => String },
              profilePicture: { required: false, type: () => String },
              bio: { required: false, type: () => String },
            },
          },
        ],
        [
          import('./modules/auth/dto/create-auth.dto'),
          {
            CreateAuthDto: {
              email: { required: true, type: () => String, format: 'email' },
              username: { required: true, type: () => String },
              password: { required: true, type: () => String },
            },
            CodeActivateDto: {
              _id: { required: true, type: () => String },
              code: { required: true, type: () => String },
            },
            ResendCodeDto: {
              _id: { required: false, type: () => String },
              email: { required: false, type: () => String, format: 'email' },
            },
          },
        ],
        [
          import('./modules/songs/dto/create-song.dto'),
          {
            CreateSongDto: {
              title: { required: true, type: () => String },
              lyrics: { required: false, type: () => String },
              thumbnail: { required: false, type: () => String, format: 'uri' },
              visibility: { required: false, type: () => String },
              genres: { required: false, type: () => [String] },
            },
          },
        ],
        [import('./modules/songs/dto/update-song.dto'), { UpdateSongDto: {} }],
        [
          import('./modules/genres/dto/create-genre.dto'),
          {
            CreateGenreDto: {
              name: { required: true, type: () => String },
              description: { required: false, type: () => String },
            },
          },
        ],
        [
          import('./modules/genres/dto/update-genre.dto'),
          { UpdateGenreDto: {} },
        ],
        [
          import('./modules/genre-song/dto/create-genre-song.dto'),
          {
            CreateGenreSongDto: {
              genreId: { required: true, type: () => String },
              songId: { required: true, type: () => String },
            },
          },
        ],
        [
          import('./modules/playlists/dto/create-playlist.dto'),
          {
            CreatePlaylistDto: {
              name: { required: true, type: () => String },
              userId: { required: true, type: () => String },
              songs: { required: false, type: () => [String] },
              visibility: { required: false, type: () => String },
            },
          },
        ],
        [
          import('./modules/playlists/dto/update-playlist.dto'),
          { UpdatePlaylistDto: {} },
        ],
        [
          import('./modules/playlists/dto/reorder-songs.dto'),
          {
            ReorderSongsDto: {
              songIds: { required: true, type: () => [String] },
            },
          },
        ],
        [
          import('./modules/likes/dto/create-like.dto'),
          {
            CreateLikeDto: {
              userId: { required: true, type: () => String },
              songId: { required: true, type: () => String },
            },
          },
        ],
        [
          import('./modules/comments/dto/create-comment.dto'),
          {
            CreateCommentDto: {
              userId: { required: true, type: () => String },
              songId: { required: true, type: () => String },
              content: { required: true, type: () => String },
            },
          },
        ],
        [
          import('./modules/comments/dto/update-comment.dto'),
          { UpdateCommentDto: {} },
        ],
        [
          import('./modules/followers/dto/create-follower.dto'),
          {
            CreateFollowerDto: {
              followerId: { required: true, type: () => String },
              followingId: { required: true, type: () => String },
            },
          },
        ],
        [import('./modules/auth/dto/update-auth.dto'), { UpdateAuthDto: {} }],
        [
          import('./modules/like-playlist/dto/create-like-playlist.dto'),
          {
            CreateLikePlaylistDto: {
              userId: { required: true, type: () => String },
              playlistId: { required: true, type: () => String },
            },
          },
        ],
        [
          import('./modules/song-playlist/dto/create-song-playlist.dto'),
          {
            CreateSongPlaylistDto: {
              songId: { required: true, type: () => String },
              playlistId: { required: true, type: () => String },
            },
          },
        ],
      ],
      controllers: [
        [
          import('./app.controller'),
          {
            AppController: {
              getHello: { type: String },
              testMail: { type: String },
            },
          },
        ],
        [
          import('./modules/auth/auth.controller'),
          {
            AuthController: {
              login: {},
              register: {},
              checkCode: {},
              resendCode: {},
              getProfile: { type: Object },
            },
          },
        ],
        [
          import('./modules/users/users.controller'),
          {
            UsersController: {
              create: {},
              findAll: {},
              getUserSongsAndPlaylists: { type: Object },
              update: { type: Object },
              updateStatus: { type: Object },
              updateRole: { type: Object },
              remove: { type: Object },
            },
          },
        ],
        [
          import('./modules/songs/songs.controller'),
          {
            SongsController: {
              create: { type: Object },
              findAll: {},
              findAllForAdmin: { type: Object },
              getUserSongs: {},
              getFeed: {},
              getUserPublicSongs: {},
              searchSongs: { type: Object },
              findOne: { type: Object },
              incrementPlays: { type: Object },
              uploadMusic: {},
              uploadMusicWithData: { type: Object },
              getSignedUrl: {},
              update: { type: Object },
              flagSong: { type: Object },
              remove: { type: Object },
              getAudioUrl: { type: Object },
            },
          },
        ],
        [
          import('./modules/genre-song/genre-song.controller'),
          {
            GenreSongController: {
              create: { type: Object },
              remove: { type: Object },
            },
          },
        ],
        [
          import('./modules/genres/genres.controller'),
          {
            GenresController: {
              create: { type: Object },
              findAll: { type: [Object] },
              findOne: { type: Object },
              update: { type: Object },
              remove: { type: Object },
            },
          },
        ],
        [
          import('./modules/playlists/playlists.controller'),
          {
            PlaylistsController: {
              create: { type: Object },
              findAll: { type: [Object] },
              getFeaturedPlaylists: { type: Object },
              systemCheck: { type: Object },
              findUserPlaylists: { type: Object },
              findPlaylistsByUserId: { type: Object },
              findAllForAdmin: { type: Object },
              findOne: { type: Object },
              debugPlaylist: { type: Object },
              fixPlaylistSongs: { type: Object },
              update: { type: Object },
              reorderSongs: { type: Object },
              addSongToPlaylist: { type: Object },
              removeSongFromPlaylist: { type: Object },
              setFeatured: { type: Object },
              remove: { type: Object },
            },
          },
        ],
        [
          import('./modules/likes/likes.controller'),
          {
            LikesController: {
              create: { type: Object },
              like: { type: Object },
              unlike: {},
              getLikeStatus: { type: Object },
              getLikeCount: {},
              checkLike: {},
              removeByUserAndSong: { type: Object },
              remove: { type: Object },
            },
          },
        ],
        [
          import('./modules/comments/comments.controller'),
          {
            CommentsController: {
              create: { type: Object },
              findAll: { type: [Object] },
              findBySongId: { type: [Object] },
              findOne: { type: Object },
              update: { type: Object },
              remove: { type: Object },
            },
          },
        ],
        [
          import('./modules/followers/followers.controller'),
          {
            FollowersController: {
              create: {},
              remove: {},
              getFollowers: {},
              getFollowing: {},
            },
          },
        ],
        [
          import('./modules/admin/admin.controller'),
          {
            AdminController: {
              getStats: { type: Object },
              getDashboardActivity: { type: Object },
              getActivity: { type: Object },
            },
          },
        ],
        [
          import('./modules/health-check/health-check.controller'),
          { HealthCheckController: { checkHealth: {}, ping: {} } },
        ],
        [
          import('./modules/playback/playback.controller'),
          { PlaybackController: { saveSession: {}, getSession: {} } },
        ],
        [
          import('./modules/like-playlist/like-playlist.controller'),
          {
            LikePlaylistController: {
              create: { type: Object },
              remove: { type: Object },
            },
          },
        ],
        [
          import('./modules/song-playlist/song-playlist.controller'),
          {
            SongPlaylistController: {
              create: { type: Object },
              remove: { type: Object },
            },
          },
        ],
      ],
    },
  };
};
