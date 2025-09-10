package com.caicemusic.app;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import org.json.JSONObject;
import org.json.JSONArray;
import org.json.JSONException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class FilePathModule extends ReactContextBaseJavaModule {

    private Promise folderPromise;

    public FilePathModule(@NonNull ReactApplicationContext reactContext) {
        super(reactContext);
        reactContext.addActivityEventListener(activityEventListener);
    }

    @NonNull
    @Override
    public String getName() {
        return "FilePathModule";
    }

    /**
     * 打开文件夹选择器
     */
    @ReactMethod
    public void pickFolder(Promise promise) {
        Activity currentActivity = getCurrentActivity();
        if (currentActivity == null) {
            promise.reject("ENOACT", "Activity 不存在");
            return;
        }

        folderPromise = promise;

        try {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                    | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);

            currentActivity.startActivityForResult(intent, 12345);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void listFilesInFolder(String folderUriStr, Promise promise) {
        try {
            Uri folderUri = Uri.parse(folderUriStr);
            ContentResolver resolver = getReactApplicationContext().getContentResolver();

            Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(
                    folderUri, DocumentsContract.getTreeDocumentId(folderUri));

            Cursor cursor = resolver.query(childrenUri,
                    new String[]{
                            DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                            DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                            DocumentsContract.Document.COLUMN_MIME_TYPE
                    },
                    null, null, null);

            if (cursor == null) {
                promise.resolve("[]");
                return;
            }

            List<JSONObject> fileList = new ArrayList<>();

            while (cursor.moveToNext()) {
                String name = cursor.getString(0);
                String docId = cursor.getString(1);
                String mime = cursor.getString(2);

                if (!DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) {
                    Uri fileUri = DocumentsContract.buildDocumentUriUsingTree(folderUri, docId);
                    JSONObject fileObj = new JSONObject();
                    fileObj.put("name", name);
                    fileObj.put("uri", fileUri.toString());
                    fileList.add(fileObj);
                }
            }
            cursor.close();

            // 按文件名正序排序
            Collections.sort(fileList, new Comparator<JSONObject>() {
                @Override
                public int compare(JSONObject o1, JSONObject o2) {
                    try {
                        return o1.getString("name").compareToIgnoreCase(o2.getString("name"));
                    } catch (JSONException e) {
                        return 0;
                    }
                }
            });

            // 转回 JSONArray
            JSONArray files = new JSONArray();
            for (JSONObject obj : fileList) {
                files.put(obj);
            }

            promise.resolve(files.toString());

        } catch (Exception e) {
            Log.e("FilePathModule", "遍历文件失败", e);
            promise.reject("ERROR", e.getMessage());
        }
    }

    private final ActivityEventListener activityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
            if (requestCode == 12345 && folderPromise != null) {
                if (resultCode == Activity.RESULT_OK && data != null) {
                    Uri uri = data.getData();
                    if (uri != null) {
                        final int takeFlags = data.getFlags()
                                & (Intent.FLAG_GRANT_READ_URI_PERMISSION
                                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                        activity.getContentResolver().takePersistableUriPermission(uri, takeFlags);

                        folderPromise.resolve(uri.toString());
                    } else {
                        folderPromise.reject("ENOURI", "未选择文件夹");
                    }
                } else {
                    folderPromise.reject("CANCELLED", "用户取消选择");
                }
                folderPromise = null;
            }
        }
    };
}
